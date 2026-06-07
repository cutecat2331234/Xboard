#!/usr/bin/env python3
"""Minimal UDP DNS forwarder: 127.0.0.1:53 -> 8.8.8.8:53"""
import socket
import threading

LISTEN = ("127.0.0.1", 53)
UPSTREAM = ("8.8.8.8", 53)


def forward_loop():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(LISTEN)
    up = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    up.settimeout(5)
    while True:
        data, addr = sock.recvfrom(4096)
        try:
            up.sendto(data, UPSTREAM)
            resp, _ = up.recvfrom(4096)
            sock.sendto(resp, addr)
        except OSError:
            pass


if __name__ == "__main__":
    forward_loop()
