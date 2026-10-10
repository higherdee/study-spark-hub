param(
    [string]$TargetMsi,
    [long]$ExeSize
)

$ErrorActionPreference = "Stop"

$wi = New-Object -ComObject WindowsInstaller.Installer
$db = $wi.OpenDatabase($TargetMsi, 1)

function ExecSql($sql) {
    try {
        $v = $db.OpenView($sql)
        $v.Execute()
        $v.Close()
    } catch {
        Write-Warning "SQL: $sql -> $($_.Exception.Message)"
    }
}

# 1. Clean app-specific tables
$cleanTables = @('File', 'Component', 'Feature', 'FeatureComponents', 'Directory', 'Shortcut', 'Media', 'Registry', 'MsiFileHash', 'LaunchCondition', 'AppSearch', 'RegLocator')
foreach ($tbl in $cleanTables) {
    ExecSql("DELETE FROM ``$tbl``")
}

# 2. Clean unwanted properties
$delProps = @('ProductName', 'ProductVersion', 'Manufacturer', 'ProductCode', 'UpgradeCode', 'ProductLanguage', 'ALLUSERS', 'ARPNOMODIFY', 'ARPNOREPAIR', 'ARPHELPLINK')
foreach ($p in $delProps) {
    ExecSql("DELETE FROM ``Property`` WHERE ``Property`` = '$p'")
}

# 3. Directory Table
ExecSql("INSERT INTO ``Directory`` (``Directory``, ``Directory_Parent``, ``DefaultDir``) VALUES ('TARGETDIR', null, 'SourceDir')")
ExecSql("INSERT INTO ``Directory`` (``Directory``, ``Directory_Parent``, ``DefaultDir``) VALUES ('LocalAppDataFolder', 'TARGETDIR', 'LocalApp')")
ExecSql("INSERT INTO ``Directory`` (``Directory``, ``Directory_Parent``, ``DefaultDir``) VALUES ('INSTALLFOLDER', 'LocalAppDataFolder', 'Syllaboss')")
ExecSql("INSERT INTO ``Directory`` (``Directory``, ``Directory_Parent``, ``DefaultDir``) VALUES ('DesktopFolder', 'TARGETDIR', 'Desktop')")
ExecSql("INSERT INTO ``Directory`` (``Directory``, ``Directory_Parent``, ``DefaultDir``) VALUES ('ProgramMenuFolder', 'TARGETDIR', 'Programs')")

# 4. Component Table
ExecSql("INSERT INTO ``Component`` (``Component``, ``ComponentId``, ``Directory_``, ``Attributes``, ``Condition``, ``KeyPath``) VALUES ('cmp_SyllabossExe', '{B3C2A961-7104-44DE-9005-D8E2824C65A1}', 'INSTALLFOLDER', 0, null, 'fil_SyllabossExe')")

# 5. File Table
ExecSql("INSERT INTO ``File`` (``File``, ``Component_``, ``FileName``, ``FileSize``, ``Version``, ``Language``, ``Attributes``, ``Sequence``) VALUES ('fil_SyllabossExe', 'cmp_SyllabossExe', 'Syllaboss.exe', $ExeSize, '1.0.0.0', '1033', 512, 1)")

# 6. Media Table
ExecSql("INSERT INTO ``Media`` (``DiskId``, ``LastSequence``, ``DiskPrompt``, ``Cabinet``, ``VolumeLabel``, ``Source``) VALUES (1, 1, '1', '#cab1.cab', null, null)")

# 7. Feature & FeatureComponents Table
ExecSql("INSERT INTO ``Feature`` (``Feature``, ``Feature_Parent``, ``Title``, ``Description``, ``Display``, ``Level``, ``Directory_``, ``Attributes``) VALUES ('ProductFeature', null, 'Syllaboss', 'Syllaboss Academic Platform Desktop Client', 1, 1, 'INSTALLFOLDER', 0)")
ExecSql("INSERT INTO ``FeatureComponents`` (``Feature_``, ``Component_``) VALUES ('ProductFeature', 'cmp_SyllabossExe')")

# 8. Shortcut Table (Desktop & Start Menu)
ExecSql("INSERT INTO ``Shortcut`` (``Shortcut``, ``Directory_``, ``Name``, ``Component_``, ``Target``, ``Arguments``, ``Description``, ``Hotkey``, ``Icon_``, ``IconIndex``, ``ShowCmd``, ``WkDir``) VALUES ('sc_Desktop', 'DesktopFolder', 'Syllaboss', 'cmp_SyllabossExe', '[#fil_SyllabossExe]', null, 'Syllaboss Academic Platform', null, null, null, 1, 'INSTALLFOLDER')")
ExecSql("INSERT INTO ``Shortcut`` (``Shortcut``, ``Directory_``, ``Name``, ``Component_``, ``Target``, ``Arguments``, ``Description``, ``Hotkey``, ``Icon_``, ``IconIndex``, ``ShowCmd``, ``WkDir``) VALUES ('sc_StartMenu', 'ProgramMenuFolder', 'Syllaboss', 'cmp_SyllabossExe', '[#fil_SyllabossExe]', null, 'Syllaboss Academic Platform', null, null, null, 1, 'INSTALLFOLDER')")

# 9. Property Table
ExecSql("INSERT INTO ``Property`` (``Property``, ``Value``) VALUES ('ProductName', 'Syllaboss')")
ExecSql("INSERT INTO ``Property`` (``Property``, ``Value``) VALUES ('Manufacturer', 'Syllaboss Ltd')")
ExecSql("INSERT INTO ``Property`` (``Property``, ``Value``) VALUES ('ProductVersion', '1.0.0')")
ExecSql("INSERT INTO ``Property`` (``Property``, ``Value``) VALUES ('ProductCode', '{7A10CE61-5511-44B4-8422-921869BC6901}')")
ExecSql("INSERT INTO ``Property`` (``Property``, ``Value``) VALUES ('UpgradeCode', '{2C03450E-16B7-4CD5-BD0A-0F88D98C2F52}')")
ExecSql("INSERT INTO ``Property`` (``Property``, ``Value``) VALUES ('ProductLanguage', '1033')")
ExecSql("INSERT INTO ``Property`` (``Property``, ``Value``) VALUES ('ALLUSERS', '2')")
ExecSql("INSERT INTO ``Property`` (``Property``, ``Value``) VALUES ('MSIINSTALLPERUSER', '1')")
ExecSql("INSERT INTO ``Property`` (``Property``, ``Value``) VALUES ('ARPNOMODIFY', '1')")
ExecSql("INSERT INTO ``Property`` (``Property``, ``Value``) VALUES ('ARPNOREPAIR', '1')")
ExecSql("INSERT INTO ``Property`` (``Property``, ``Value``) VALUES ('ARPHELPLINK', 'https://syllaboss.org')")

# 10. Summary Information
$sumInfo = $db.SummaryInformation(20)
$sumInfo.Property(2) = "Installation Database"
$sumInfo.Property(3) = "Syllaboss Desktop"
$sumInfo.Property(4) = "Syllaboss Ltd"
$sumInfo.Property(7) = "Intel;1033"
$sumInfo.Property(9) = "{B3564A19-1E32-474F-A845-F53B75C8E75C}"
$sumInfo.Persist()

$db.Commit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($db) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($wi) | Out-Null

Write-Host "MSI tables populated and committed successfully!"
