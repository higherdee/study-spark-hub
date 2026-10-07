using System;
using System.IO;
using System.Security.Cryptography;
using System.Security.Cryptography.Pkcs;
using System.Security.Cryptography.X509Certificates;

namespace SignSf
{
    class Program
    {
        static void Main(string[] args)
        {
            string sfPath = args.Length > 0 ? args[0] : "CERT.SF";
            string rsaPath = args.Length > 1 ? args[1] : "CERT.RSA";
            string pfxPath = args.Length > 2 ? args[2] : @"scripts\signing-key.pfx";
            string password = args.Length > 3 ? args[3] : "syllaboss123";

            X509Certificate2 cert = new X509Certificate2(pfxPath, password, X509KeyStorageFlags.Exportable);
            byte[] sfBytes = File.ReadAllBytes(sfPath);

            ContentInfo content = new ContentInfo(sfBytes);
            SignedCms signedCms = new SignedCms(content, true);
            CmsSigner signer = new CmsSigner(cert);
            signer.DigestAlgorithm = new Oid("1.3.14.3.2.26"); // SHA-1 for Android v1 signature
            signer.IncludeOption = X509IncludeOption.EndCertOnly;
            signedCms.ComputeSignature(signer);
            byte[] rsaBytes = signedCms.Encode();

            File.WriteAllBytes(rsaPath, rsaBytes);
            Console.WriteLine("SUCCESS: Signed CERT.SF into " + rsaPath);
        }
    }
}
