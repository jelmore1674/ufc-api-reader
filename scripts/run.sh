#!/bin/sh

export NVM_DIR=~/.nvm
source ~/.nvm/nvm.sh
echo "Making sure in correct directory.."
cd ~/ufc-api-reader
echo "Scraping Data.."
yarn start


