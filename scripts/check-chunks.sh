#!/bin/bash
grep -o 'LoginPage-[^"]*' /opt/xboard/public/theme/Xboard/assets/umi.js | head -3
grep -o 'AuthLayout-[^"]*' /opt/xboard/public/theme/Xboard/assets/umi.js | head -3
ls /opt/xboard/public/theme/Xboard/assets/chunks/LoginPage* 2>/dev/null
ls /opt/xboard/public/theme/Xboard/assets/chunks/AuthLayout* 2>/dev/null
