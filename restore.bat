@ECHO OFF
edgedb instance start -I pemonlist
edgedb -I KontrollFreek/pemonlist dump out.db
echo Yes | edgedb branch wipe main
edgedb restore out.db
edgedb migrate
