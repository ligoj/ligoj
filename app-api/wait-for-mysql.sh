#!/bin/bash
# wait-for-mysql.sh

set -e

host="$1"
shift
cmd="$@"

until mysql -h$host -P3306 -uligoj -pligoj -e 'show databases;'; do
  >&2 echo "Database is unavailable - sleeping"
  sleep 5
done

>&2 echo "Database is up - executing command"
exec $cmd
