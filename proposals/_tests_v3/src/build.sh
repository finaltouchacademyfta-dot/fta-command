set -e
cat /tmp/claude-0/-home-claude/bc87f3e9-52ed-5ca8-bcaf-b3feca830d7e/scratchpad/zz3parts/p{1-core,2-chat,3-live,4-connect}.js > /home/claude/prod/proposals/zz3-connect.js
node --check /home/claude/prod/proposals/zz3-connect.js
node --check /home/claude/prod/proposals/demo-proposals.js
cd /tmp/claude-0/-home-claude/bc87f3e9-52ed-5ca8-bcaf-b3feca830d7e/scratchpad/preview-v3
rm -rf site && cp -r /home/claude/prod/site-mock site && python3 inject.py >/dev/null && PROPOSALS=1 python3 single.py && mkdir -p two && cp FTA-Proposals-Demo.html two/
