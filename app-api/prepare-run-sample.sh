# !/bin/bash
# This script add Python binary to base image
microdnf update && microdnf install python3.11 python3.11-pip python3.11-wheel jq && \
echo -e '#!/bin/bash\npython3 "$@"' > /usr/bin/python && chmod +x /usr/bin/python && \
echo -e '#!/bin/bash\npip3 "$@"' > /usr/bin/pip && chmod +x /usr/bin/pip && \
python --version && pip --version && pip install getopts requests
