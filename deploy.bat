git add .
git commit -m "update with deploy"
git push
git push heroku master
wsl heroku logs --tail