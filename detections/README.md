# detections

[![validate](https://github.com/aaronsawit/detections/actions/workflows/validate.yml/badge.svg)](https://github.com/aaronsawit/detections/actions/workflows/validate.yml)

Sigma detection rules written from things I have actually investigated, mapped to MITRE ATT&CK, and tested.

A rule that parses is not a rule that works. It can miss the case it was written for, or fire on every normal event. So every rule here ships with events it **must** match and events it **must not**, and CI runs all three checks on every push: `sigma check`, the fixture tests, and conversion to a real SIEM query language.

| Rule | ATT&CK | Log source | Where it came from |
|---|---|---|---|
| [System DLL loaded from a user-writable path](rules/win_sysmon_dll_sideload_system_dll_user_path.yml) | T1574.001 | Sysmon event 7 | A Sysmon lab where a copied `calc.exe` loaded a planted `WININET.dll` |
| [.NET runtime loaded by a process that is not a .NET host](rules/win_sysmon_unmanaged_powershell_clr_load.yml) | T1059.001, T1055 | Sysmon event 7 | Unmanaged PowerShell: PowerShell with no `powershell.exe` in the process log |
| [SSH password brute force from one source](rules/lnx_sshd_failed_password.yml) | T1110.001 | sshd auth log | Sigma correlation rule, ported from [blue-team-ai](https://github.com/aaronsawit/blue-team-ai) |
| [Client bypassing the filtering resolver with encrypted DNS](rules/dns_encrypted_dns_bypass_of_filtering_resolver.yml) | T1071.004, T1572 | DNS query log | One phone on my own network went silent in the resolver log. It was iCloud Private Relay. |
| [Systemd unit written outside a package manager](rules/lnx_file_event_systemd_unit_written_outside_package_manager.yml) | T1543.002, T1053.006 | Linux file events (Sysmon for Linux, auditd) | I write service and timer units by hand on my own server, so I know what normal looks like: rare, and always an editor or a shell |

## Run the checks

```bash
pip install sigma-cli pysigma-backend-splunk pysigma-backend-elasticsearch pyyaml
sigma check rules/
python tests/run_tests.py
sigma convert -t splunk --without-pipeline rules/lnx_sshd_failed_password.yml
```

`tests/fixtures.json` holds the match and no-match events for each rule. `tests/run_tests.py` is a small evaluator for the subset of Sigma these rules use: field maps, lists, `contains` / `endswith` / `startswith`, boolean conditions and `event_count` correlations. `converted/` holds the Splunk SPL and Elastic Lucene output of every rule.

## Notes

- The false-positive section of each rule is written from what the no-match fixtures taught me, for example a signed Microsoft DLL shipped inside an application folder.
- Current ATT&CK data splits the old Defense Evasion tactic, so these rules are tagged `attack.stealth`. `sigma check` validates the tags against live ATT&CK data and will fail CI if they drift.
- Field names follow the Sigma taxonomy for Sysmon. The DNS and sshd rules use generic field names (`query`, `src_ip`, `message`) that need a processing pipeline to map onto a specific SIEM schema.
