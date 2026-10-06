$cert = New-SelfSignedCertificate -Subject "CN=Syllaboss, O=Syllaboss, C=US" -KeyAlgorithm RSA -KeyLength 2048 -CertStoreLocation "Cert:\CurrentUser\My" -NotAfter (Get-Date).AddYears(25)
$pwd = ConvertTo-SecureString -String "syllaboss123" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath "$PSScriptRoot\signing-key.pfx" -Password $pwd
Export-Certificate -Cert $cert -FilePath "$PSScriptRoot\signing-cert.cer"
Write-Output "Keystore successfully created at $PSScriptRoot\signing-key.pfx"
