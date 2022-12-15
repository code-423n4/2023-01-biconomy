#!/bin/bash

contracts=$(find $CONTRACTS_DIR -name "*.sol")
let contractsCount=0
printf "%-8s %-100s %-4s\n" "No." "Contract" "SLoC";
for i in $contracts
do
    contractsCount=$((contractsCount+1))
    sloc=$(cat $i | sed '/^\s*$/d' | wc -l | xargs)
    printf "%-8d %-100s %-4d\n" $contractsCount $i $sloc;
done