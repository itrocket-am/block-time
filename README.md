Create key
```
ssh-keygen -t ed25519 -C "vladislav.subbotin2010@gmail.com" -f ~/.ssh/block-time
```

Add key to `nano ~/.ssh/config`
```
Host github10.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/block-time
  IdentitiesOnly yes
  AddKeysToAgent yes
```

Clone repository
```
cd
git clone git@github10.com:itrocket-am/block-time.git block-time-mainnet
cd block-time-mainnet
git remote set-url origin git@github10.com:itrocket-am/block-time.git
```

Clone repository
```
cd
git clone git@github10.com:itrocket-am/block-time.git block-time-testnet
cd block-time-testnet
git remote set-url origin git@github10.com:itrocket-am/block-time.git
```

Configure `nano ~/block-time-mainnet/.env`
```
PB_LOGIN=''
PB_PASSWORD=''
```

Configure `nano ~/block-time-mainnet/config.json`
```
{
	"projectsUrl": "https://raw.githubusercontent.com/itrocket-am/itrocket/main/data/projects.json",
	"pbUrl": "https://pb.itrocket.net",
	"networkType": "mainnet"
}
```

Start pm2 process
```
cd ~/block-time-mainnet
npm install
pm2 start /root/block-time-mainnet/index.js --name block-time-mainnet
```

```
cd ~/block-time-testnet
npm install
npm audit fix
pm2 start /root/block-time-testnet/index.js --name block-time-testnet
```

```
pm2 save
pm2 startup
```

Create deploy script
```
cd
nano ~/build-timer.sh
```

```
#!/bin/bash
# pm2 start notification_bot

install_dependencies() {
  if [ "$1" -gt 0 ]; then
    echo "Dependencies changed in package.json, updating dependencies..."
    npm i
  fi
}

send_telegram_notification() {
  BOT_TOKEN=""
  CHAT_ID_ALARM=""
  MESSAGE="Timer monitoring Testnet and Mainnet built and moved to public folder!"
  curl --header 'Content-Type: application/json' --request 'POST' --data "{\"chat_id\":\"${CHAT_ID_ALARM}\", \"text\":\"${MESSAGE}\", \"parse_mode\": \"html\"}" "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" /dev/null 2>&1
}

for((;;)); do
  for dir in /root/block-time-testnet /root/block-time-mainnet; do
    cd $dir
    echo "Checking updates in directory $dir ..."
    git stash
    GIT_PULL_RESULT=$(git pull git@github10.com:itrocket-am/block-time.git main)
    echo -e "\033[0;32m"$GIT_PULL_RESULT"\033[0m"
    GIT_STATUS=$(echo ${GIT_PULL_RESULT} | awk '{print $1}')
    PACKAGE_JSON_UPDATED=$(git diff HEAD@{1} HEAD --name-only | grep -c "package.json")

    if [ "$GIT_STATUS" == "Updating" ]; then
      install_dependencies $PACKAGE_JSON_UPDATED
      pm2 restart block-time-mainnet --update-env block-time-testnet --update-env
      send_telegram_notification $dir
    else
      echo "No have any updates yet"
    fi
  done

  echo "Waiting 5 sec and checking Updates..."
  sleep 5
done
```

Create systemd file
```
nano /etc/systemd/system/build-timer.service
```

```
[Unit]
Description=Timer monitoring autobuild
After=network.target

[Service]
User=root
ExecStart=/bin/bash /root/build-timer.sh
StandardOutput=inherit
StandardError=inherit
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start deploy script
```
sudo systemctl daemon-reload
sudo systemctl enable build-timer
sudo systemctl restart build-timer && sudo journalctl -u build-timer -f
```
