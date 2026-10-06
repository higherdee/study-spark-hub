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
            string inputApk = args.Length > 0 ? args[0] : "Syllaboss-unsigned.apk";
            string outputApk = args.Length > 1 ? args[1] : @"public\downloads\syllaboss.apk";
            string pfxPath = @"scripts\signing-key.pfx";
            string password = "syllaboss123";

            Console.WriteLine("Loading certificate from " + pfxPath);
            X509Certificate2 cert = new X509Certificate2(pfxPath, password, X509KeyStorageFlags.Exportable);

            if (!File.Exists(inputApk))
            {
                Console.WriteLine("Input APK not found: " + inputApk);
                return;
            }

            Directory.CreateDirectory(Path.GetDirectoryName(outputApk));
            if (File.Exists(outputApk))
            {
                File.Delete(outputApk);
            }

            File.Copy(inputApk, outputApk, true);

            Console.WriteLine("Signing " + outputApk + " with APK v1 signature...");

            Dictionary<string, string> digests = new Dictionary<string, string>();
            using (FileStream fs = new FileStream(outputApk, FileMode.Open, FileAccess.ReadWrite))
            using (ZipArchive archive = new ZipArchive(fs, ZipArchiveMode.Update))
            {
                // Collect and compute digests for all files not in META-INF
                SHA256 sha256 = SHA256.Create();
                foreach (ZipArchiveEntry entry in archive.Entries)
                {
                    if (entry.FullName.StartsWith("META-INF/", StringComparison.OrdinalIgnoreCase))
                        continue;

                    using (Stream s = entry.Open())
                    {
                        byte[] hash = sha256.ComputeHash(s);
                        digests[entry.FullName] = Convert.ToBase64String(hash);
                    }
                }

                // 1. Build MANIFEST.MF
                StringBuilder manifestBuilder = new StringBuilder();
                manifestBuilder.Append("Manifest-Version: 1.0\r\n");
                manifestBuilder.Append("Created-By: 1.0 (Android SignApk)\r\n\r\n");

                Dictionary<string, string> entryManifestDigests = new Dictionary<string, string>();

                foreach (var kvp in digests)
                {
                    string entryBlock = "Name: " + kvp.Key + "\r\nSHA-256-Digest: " + kvp.Value + "\r\n\r\n";
                    manifestBuilder.Append(entryBlock);

                    byte[] entryBytes = Encoding.UTF8.GetBytes(entryBlock);
                    entryManifestDigests[kvp.Key] = Convert.ToBase64String(sha256.ComputeHash(entryBytes));
                }

                byte[] manifestBytes = Encoding.UTF8.GetBytes(manifestBuilder.ToString());
                byte[] manifestHash = sha256.ComputeHash(manifestBytes);

                // 2. Build CERT.SF
                StringBuilder sfBuilder = new StringBuilder();
                sfBuilder.Append("Signature-Version: 1.0\r\n");
                sfBuilder.Append("Created-By: 1.0 (Android SignApk)\r\n");
                sfBuilder.Append("SHA-256-Digest-Manifest: " + Convert.ToBase64String(manifestHash) + "\r\n\r\n");

                foreach (var kvp in entryManifestDigests)
                {
                    sfBuilder.Append("Name: " + kvp.Key + "\r\n");
                    sfBuilder.Append("SHA-256-Digest: " + kvp.Value + "\r\n\r\n");
                }

                byte[] sfBytes = Encoding.UTF8.GetBytes(sfBuilder.ToString());

                // 3. Build CERT.RSA (PKCS#7 SignedData)
                ContentInfo content = new ContentInfo(sfBytes);
                SignedCms signedCms = new SignedCms(content, true); // detached signature
                CmsSigner signer = new CmsSigner(cert);
                signer.DigestAlgorithm = new Oid("2.16.840.1.101.3.4.2.1"); // SHA-256 OID
                signer.IncludeOption = X509IncludeOption.EndCertOnly;
                signedCms.ComputeSignature(signer);
                byte[] rsaBytes = signedCms.Encode();

                // Write into META-INF/ in the zip archive
                ZipArchiveEntry manifestEntry = archive.CreateEntry("META-INF/MANIFEST.MF", CompressionLevel.Optimal);
                using (Stream writer = manifestEntry.Open())
                {
                    writer.Write(manifestBytes, 0, manifestBytes.Length);
                }

                ZipArchiveEntry sfEntry = archive.CreateEntry("META-INF/CERT.SF", CompressionLevel.Optimal);
                using (Stream writer = sfEntry.Open())
                {
                    writer.Write(sfBytes, 0, sfBytes.Length);
                }

                ZipArchiveEntry rsaEntry = archive.CreateEntry("META-INF/CERT.RSA", CompressionLevel.Optimal);
                using (Stream writer = rsaEntry.Open())
                {
                    writer.Write(rsaBytes, 0, rsaBytes.Length);
                }
            }

            Console.WriteLine("SUCCESS: Created signed APK at " + outputApk);
        }
    }
}
