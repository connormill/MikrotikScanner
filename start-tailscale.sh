#!/bin/bash
mkdir -p /tmp/tailscale
tailscaled --state=/tmp/tailscale/tailscaled.state --socket=/tmp/tailscale/tailscaled.sock --tun=userspace-networking > /tmp/tailscale/daemon.log 2>&1 &
echo "Tailscale daemon started with PID $!"
sleep 2
tailscale --socket=/tmp/tailscale/tailscaled.sock status
