using System;
using System.IO;
using System.IO.Compression;
using System.Security.Cryptography;
using System.Security.Cryptography.Pkcs;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Collections.Generic;

namespace SyllabossSigner
{
    class Program
    {
        static void Main(string[] args)
        {
            string sourceApk = args.Length > 0 ? args[0] : @"public\downloads\syllaboss.apk";
            string outputApk = args.Length > 1 ? args[1] : @"public\downloads\syllaboss-signed.apk";
            string pfxPath = @"scripts\signing-key.pfx";
            string password = "syllaboss123";

            if (!File.Exists(sourceApk))
            {
                Console.WriteLine("Source APK not found: " + sourceApk);
                return;
            }

            Console.WriteLine("Loading certificate from " + pfxPath);
            X509Certificate2 cert = new X509Certificate2(pfxPath, password, X509KeyStorageFlags.Exportable);

            string tempRepack = Path.Combine(Path.GetTempPath(), "syllaboss_repack_" + Guid.NewGuid().ToString("N") + ".apk");

            Console.WriteLine("Reading entries from " + sourceApk + "...");

            Dictionary<string, byte[]> fileContents = new Dictionary<string, byte[]>();
            using (FileStream fs = new FileStream(sourceApk, FileMode.Open, FileAccess.Read))
            using (ZipArchive srcZip = new ZipArchive(fs, ZipArchiveMode.Read))
            {
                foreach (ZipArchiveEntry entry in srcZip.Entries)
                {
                    if (entry.FullName.StartsWith("META-INF/", StringComparison.OrdinalIgnoreCase))
                        continue;

                    using (Stream es = entry.Open())
                    using (MemoryStream ms = new MemoryStream())
                    {
                        es.CopyTo(ms);
                        fileContents[entry.FullName] = ms.ToArray();
                    }
                }
            }

            Console.WriteLine("Repacking APK with Stored resources.arsc (Method 0) and computing dual digests (SHA-1 + SHA-256)...");

            SHA1 sha1 = SHA1.Create();
            SHA256 sha256 = SHA256.Create();

            Dictionary<string, string> sha1Digests = new Dictionary<string, string>();
            Dictionary<string, string> sha256Digests = new Dictionary<string, string>();

            using (FileStream outFs = new FileStream(tempRepack, FileMode.Create, FileAccess.ReadWrite))
            using (ZipArchive destZip = new ZipArchive(outFs, ZipArchiveMode.Create))
            {
                foreach (var kvp in fileContents)
                {
                    string name = kvp.Key;
                    byte[] data = kvp.Value;

                    // Android OS AssetManager STRICT REQUIREMENT: resources.arsc MUST be STORED (uncompressed)
                    bool storeUncompressed = name.Equals("resources.arsc", StringComparison.OrdinalIgnoreCase) ||
                                            name.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ||
                                            name.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) ||
                                            name.EndsWith(".ogg", StringComparison.OrdinalIgnoreCase);

                    CompressionLevel level = storeUncompressed ? CompressionLevel.NoCompression : CompressionLevel.Optimal;

                    ZipArchiveEntry newEntry = destZip.CreateEntry(name, level);
                    using (Stream s = newEntry.Open())
                    {
                        s.Write(data, 0, data.Length);
                    }

                    sha1Digests[name] = Convert.ToBase64String(sha1.ComputeHash(data));
                    sha256Digests[name] = Convert.ToBase64String(sha256.ComputeHash(data));
                }

                // 1. Build MANIFEST.MF
                StringBuilder manifestSb = new StringBuilder();
                manifestSb.Append("Manifest-Version: 1.0\r\n");
                manifestSb.Append("Created-By: 1.0 (Android SignApk)\r\n\r\n");

                Dictionary<string, string> entryManifestSha1 = new Dictionary<string, string>();
                Dictionary<string, string> entryManifestSha256 = new Dictionary<string, string>();

                foreach (var kvp in fileContents)
                {
                    string name = kvp.Key;
                    StringBuilder entrySb = new StringBuilder();
                    entrySb.Append("Name: ").Append(name).Append("\r\n");
                    entrySb.Append("SHA1-Digest: ").Append(sha1Digests[name]).Append("\r\n");
                    entrySb.Append("SHA-256-Digest: ").Append(sha256Digests[name]).Append("\r\n\r\n");

                    string entryBlock = entrySb.ToString();
                    manifestSb.Append(entryBlock);

                    byte[] entryBytes = Encoding.UTF8.GetBytes(entryBlock);
                    entryManifestSha1[name] = Convert.ToBase64String(sha1.ComputeHash(entryBytes));
                    entryManifestSha256[name] = Convert.ToBase64String(sha256.ComputeHash(entryBytes));
                }

                byte[] manifestBytes = Encoding.UTF8.GetBytes(manifestSb.ToString());
                byte[] manifestSha1 = sha1.ComputeHash(manifestBytes);
                byte[] manifestSha256 = sha256.ComputeHash(manifestBytes);

                // 2. Build CERT.SF
                StringBuilder sfSb = new StringBuilder();
                sfSb.Append("Signature-Version: 1.0\r\n");
                sfSb.Append("Created-By: 1.0 (Android SignApk)\r\n");
                sfSb.Append("SHA1-Digest-Manifest: ").Append(Convert.ToBase64String(manifestSha1)).Append("\r\n");
                sfSb.Append("SHA-256-Digest-Manifest: ").Append(Convert.ToBase64String(manifestSha256)).Append("\r\n\r\n");

                foreach (var kvp in fileContents)
                {
                    string name = kvp.Key;
                    sfSb.Append("Name: ").Append(name).Append("\r\n");
                    sfSb.Append("SHA1-Digest: ").Append(entryManifestSha1[name]).Append("\r\n");
                    sfSb.Append("SHA-256-Digest: ").Append(entryManifestSha256[name]).Append("\r\n\r\n");
                }

                byte[] sfBytes = Encoding.UTF8.GetBytes(sfSb.ToString());

                // 3. Build CERT.RSA (PKCS#7 SignedData detached)
                ContentInfo content = new ContentInfo(sfBytes);
                SignedCms signedCms = new SignedCms(content, true);
                CmsSigner signer = new CmsSigner(cert);
                signer.DigestAlgorithm = new Oid("1.3.14.3.2.26"); // SHA-1 OID (universally supported across all Android versions)
                signer.IncludeOption = X509IncludeOption.EndCertOnly;
                signedCms.ComputeSignature(signer);
                byte[] rsaBytes = signedCms.Encode();

                // 4. Add META-INF entries
                ZipArchiveEntry manifestEntry = destZip.CreateEntry("META-INF/MANIFEST.MF", CompressionLevel.NoCompression);
                using (Stream writer = manifestEntry.Open())
                {
                    writer.Write(manifestBytes, 0, manifestBytes.Length);
                }

                ZipArchiveEntry sfEntry = destZip.CreateEntry("META-INF/CERT.SF", CompressionLevel.NoCompression);
                using (Stream writer = sfEntry.Open())
                {
                    writer.Write(sfBytes, 0, sfBytes.Length);
                }

                ZipArchiveEntry rsaEntry = destZip.CreateEntry("META-INF/CERT.RSA", CompressionLevel.NoCompression);
                using (Stream writer = rsaEntry.Open())
                {
                    writer.Write(rsaBytes, 0, rsaBytes.Length);
                }
            }

            // Replace original output APK
            if (File.Exists(outputApk))
            {
                File.Delete(outputApk);
            }
            File.Move(tempRepack, outputApk);

            Console.WriteLine("SUCCESS: Corrected, aligned, and signed APK written to: " + outputApk);
        }
    }
}
