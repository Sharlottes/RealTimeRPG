git add .
git commit -m "update with deploy"
git push heroku master
heroku logs --tail