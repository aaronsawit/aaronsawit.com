# Detections

Sigma rules I wrote from things I have actually investigated, each mapped to MITRE ATT&CK and each with events it must match and events it must not.

```bash
pip install sigma-cli pysigma-backend-splunk pysigma-backend-elasticsearch pyyaml
sigma check rules/                 # syntax and ATT&CK tag validation
python tests/run_tests.py          # detection logic against fixtures
sigma convert -t splunk --without-pipeline rules/<rule>.yml
```

`converted/` holds the Splunk SPL and Elastic Lucene output of every rule, regenerated with `sigma convert`.
