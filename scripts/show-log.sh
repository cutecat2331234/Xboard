#!/bin/bash
tail -30 /opt/xboard/storage/logs/laravel-2026-06-08.log | tr -cd '\11\12\15\40-\176'
