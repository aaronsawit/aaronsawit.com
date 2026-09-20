# ATT&CK coverage

Generated from the rules' tags by `tools/coverage.py`. Do not edit by hand.

| Technique | Rules |
|---|---|
| [T1048.003](https://attack.mitre.org/techniques/T1048/003/) | [DNS Query With A Very Long Label](../rules/dns_query_very_long_label_possible_tunnelling.yml) |
| [T1053.006](https://attack.mitre.org/techniques/T1053/006/) | [Systemd Unit Written Outside A Package Manager](../rules/lnx_file_event_systemd_unit_written_outside_package_manager.yml) |
| [T1055](https://attack.mitre.org/techniques/T1055/) | [.NET Runtime Loaded by a Process That Is Not a .NET Host](../rules/win_sysmon_unmanaged_powershell_clr_load.yml) |
| [T1059.001](https://attack.mitre.org/techniques/T1059/001/) | [.NET Runtime Loaded by a Process That Is Not a .NET Host](../rules/win_sysmon_unmanaged_powershell_clr_load.yml) |
| [T1059.004](https://attack.mitre.org/techniques/T1059/004/) | [Download Piped Straight Into A Shell](../rules/lnx_proc_download_piped_to_shell.yml) |
| [T1071.004](https://attack.mitre.org/techniques/T1071/004/) | [Client Bypassing the Filtering Resolver With Encrypted DNS or a Relay](../rules/dns_encrypted_dns_bypass_of_filtering_resolver.yml)<br>[DNS Query With A Very Long Label](../rules/dns_query_very_long_label_possible_tunnelling.yml) |
| [T1098.004](https://attack.mitre.org/techniques/T1098/004/) | [SSH Authorized Keys Modified By Something Other Than SSH Tooling](../rules/lnx_file_event_ssh_authorized_keys_modified.yml) |
| [T1105](https://attack.mitre.org/techniques/T1105/) | [Download Piped Straight Into A Shell](../rules/lnx_proc_download_piped_to_shell.yml) |
| [T1110.001](https://attack.mitre.org/techniques/T1110/001/) | [SSH Password Brute Force From One Source](../rules/lnx_sshd_failed_password.yml) |
| [T1543.002](https://attack.mitre.org/techniques/T1543/002/) | [Systemd Unit Written Outside A Package Manager](../rules/lnx_file_event_systemd_unit_written_outside_package_manager.yml) |
| [T1548.003](https://attack.mitre.org/techniques/T1548/003/) | [Sudoers Configuration Written Outside Visudo Or A Package Manager](../rules/lnx_file_event_sudoers_modified.yml) |
| [T1572](https://attack.mitre.org/techniques/T1572/) | [Client Bypassing the Filtering Resolver With Encrypted DNS or a Relay](../rules/dns_encrypted_dns_bypass_of_filtering_resolver.yml) |
| [T1574.001](https://attack.mitre.org/techniques/T1574/001/) | [System DLL Loaded From a User-Writable Path](../rules/win_sysmon_dll_sideload_system_dll_user_path.yml) |
| [T1610](https://attack.mitre.org/techniques/T1610/) | [Container Started With Host-Level Access](../rules/lnx_proc_docker_container_with_host_level_access.yml) |
| [T1611](https://attack.mitre.org/techniques/T1611/) | [Container Started With Host-Level Access](../rules/lnx_proc_docker_container_with_host_level_access.yml) |

15 techniques, 10 rule files.
