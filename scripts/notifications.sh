#!/bin/bash

##########################################################################
#   Script to handle calls for sending notifications to mpro services.   #
##########################################################################

service_name="mpro_notifications"
service_directory="./$service_name"
pid_file="$service_directory/.pid"

log_directory="$service_directory/logs"
log_file="$log_directory/$service_name.log"

# services is going to exec by 30 second
interval_time=60
log_max_size=1024
pid=`echo $$`
last_pid=""

host=""
port=""
method=""

validate_service() {
  echo -z "$last_pid"
  
  if [ -z "$last_pid" ]; then
    return 0
  elif [ `ps aux | grep "$last_pid" | grep -v grep > /dev/null 2> /dev/null &` ]; then
    if [ `cat "$pid_file"` = "$last_pid" ]; then
      return 1
    else
      return 0
    fi
  else
    return 0
  fi
}

setUpEnvironment() {
  if [ -f $pid_file ]; then
    last_pid=`cat $pid_file`
  fi

  if [ ! -d "$service_directory" ]; then
    mkdir "$service_directory" 
  fi

  if [ ! -d "$log_directory" ]; then
    mkdir "$log_directory" 
  fi

  if [ ! -f "$log_file" ]; then
    touch "$log_file"
  else
    size=$((`ls -l "$log_file" | stat -c%s "$log_file"`))
    
    if [ $size -gt  $log_max_size ]; then
      mv $log_file "$log_file.old"
      touch "$log_file"
    fi
  fi
}

log() {
  echo "$1" >> "$log_file"
}

call_services() {
  log "calling to -> $host $port $method`date +"%Y-%m-%d %H:%M:%S" `" 
  returnValue=`curl -i -H "Accept: application/json" -H "Content-Type: application/json" -X GET http://localhost:3000/notifications`
  log "$returnValue"
}

foreach() {
  date=`date +%s`

  if [ -z $last ]; then
    last=`date +%s`
  fi

  call_services

  last=`date +%s`

  if [ ! $((date-last+interval_time+1)) -lt $((interval_time)) ]; then
    sleep $((date - last + interval_time))
  fi

  foreach
}

start() {
  echo "called start function"
  
  setUpEnvironment    
  validate_service
  returnVal=$?
  
  if [ "$returnVal" = 1 ]; then
    echo "Services already running"
    exit 1
  fi

  echo "We are going to star this services"
  echo "$pid" > "$pid_file"

  log "start service $service_name -> `date +"%Y-%m-%d %H:%M:%S" `" 

  foreach
}

stop() {
  echo "called stop function"
  
  validate_service
  returnVal=$?
  
  if [[ "$returnVal" =  1 ]]; then
    echo "Services is not running"
    exit 1
  fi

  echo "stopping service"
    
  if [ ! -z `cat $pid_file` ]; then
    kill -9 `cat "$pid_file"` &> /dev/null
    log "`date + "%Y-%m-d %H:%M:%S"` : service_name is stop"
  fi
}

init() {
  if [ -z "$1" ]; then
    echo "-Parameter is zero length"
  else
    case $1 in
      start)
        echo "start service " `date`
        start
        ;;
      stop)
        echo "service is stoping " `date`
        stop
        ;;
      *)
        echo "Enter an option between start and stop, eg: sh $0 {star|stop}"
        exit 1
        ;;
    esac
  fi
}

init $1