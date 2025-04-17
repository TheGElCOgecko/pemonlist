@ECHO OFF
gel instance start -I pemonlist
gel -I KontrollFreek/pemonlist dump out.db
echo Yes | gel branch wipe main
gel restore out.db
gel migrate
