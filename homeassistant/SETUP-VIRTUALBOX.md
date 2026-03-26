# Home Assistant Setup On Windows With VirtualBox

Last updated: 2026-03-26

This guide is the shared team setup path for running `Home Assistant OS` locally on a Windows machine with `VirtualBox`.

Use this guide if you want a stable development environment with:

- `Home Assistant`
- `MQTT`
- a clean bridge to the custom `backend/`
- the option to move the same HA setup to dedicated hardware later

## Why This Path

Recommended team baseline:

- host machine: `Windows`
- virtualization: `VirtualBox`
- install type: `Home Assistant OS`

Do **not** use `WSL` as the main Home Assistant runtime for this project.

Why:

- `Home Assistant OS` is the most straightforward path for HA add-ons and integrations
- the team needs a repeatable setup, not a custom one-off environment
- the chosen architecture depends on stable `MQTT`, HA APIs, and local networking

## Before You Start

You need:

- a Windows machine
- `VirtualBox` installed
- hardware virtualization enabled in BIOS or UEFI if VirtualBox complains
- at least `2 GB RAM` and `2 vCPU` available for the VM

Recommended for this project:

- `4 GB RAM`
- `2 vCPU`

Reason:

- this is an inference, not an official hard requirement
- the official Home Assistant minimum is lighter, but this project will add MQTT and local integrations, so more headroom is safer

## Download Links

- Home Assistant Windows install guide:
  https://www.home-assistant.io/installation/windows/
- Home Assistant install overview:
  https://www.home-assistant.io/installation/
- VirtualBox downloads:
  https://www.virtualbox.org/wiki/Downloads

## Step By Step

### 1. Install VirtualBox

Install `VirtualBox` on Windows.

If it is already installed, make sure it starts correctly and you can create a new VM.

### 2. Download Home Assistant OS For VirtualBox

Open the official Windows install guide:

https://www.home-assistant.io/installation/windows/

Download the `VirtualBox (.vdi)` image for `Home Assistant OS`.

After the download finishes:

- extract the archive
- keep the `.vdi` file somewhere easy to find

### 3. Create A New Virtual Machine

In VirtualBox:

- click `New`
- name it `Home Assistant`
- keep `ISO Image` empty
- set `Type` to `Linux`
- set `Version` to `Oracle Linux (64-bit)`

Finish the initial VM creation.

### 4. Configure VM Resources

Open the VM settings and set:

- memory: `4096 MB` recommended
- processors: `2`

Then enable:

- `EFI`

If the VM later refuses to boot, re-check that virtualization is enabled in BIOS or UEFI.

### 5. Attach The Home Assistant Disk

Open:

- `Settings -> Storage`

Then:

- remove the placeholder disk created by VirtualBox
- add an existing hard disk
- select the extracted `Home Assistant OS .vdi`

### 6. Configure Network

Open:

- `Settings -> Network`

Use this configuration:

- `Adapter 1`: enabled, `NAT`
- `Adapter 2`: enabled, `Bridged Adapter`
- `Adapter 2 Name`: your active network adapter

Why this is recommended:

- `NAT` gives the VM reliable outbound internet access for add-on downloads and updates
- `Bridged Adapter` keeps HA visible on the local network

This project already hit a real case where `Bridged Adapter` alone made add-on downloads fail with `network is unreachable` errors against `github.com` and `ghcr.io`.

### 7. Start The Virtual Machine

Boot the VM.

The first start can take a few minutes.

Do not panic if the web UI is not ready immediately.

### 8. Open Home Assistant In The Browser

Try:

- `http://homeassistant.local:8123`

If that does not resolve, try:

- `http://homeassistant:8123`
- `http://<VM-IP>:8123`

To find the IP:

- check the VM console
- or inspect your router or local network client list

### 9. Finish The Home Assistant Onboarding

Create:

- admin user
- password
- location
- timezone

After login, let Home Assistant finish background initialization.

### 10. Update The System

Open:

- `Settings -> System -> Updates`

Install available updates before adding project-specific integrations.

## What To Install Next

After Home Assistant works, the next team setup steps are:

1. `MQTT`
2. one additional local HA integration for assignment compliance, recommended `Ping`
3. backend bridge work

Do not treat `Music Assistant` as part of the baseline.

If someone already installed it during testing, it can be removed from HA to keep the environment aligned with the chosen architecture.

## Recommended Team Rule

Each teammate should do this once:

1. boot `Home Assistant` successfully
2. log in through port `8123`
3. make one screenshot of the working HA dashboard
4. note down the VM IP

This makes it obvious that everyone has the same baseline environment.

## Troubleshooting

### Home Assistant URL does not open

Try the VM IP instead of `homeassistant.local`.

### VM does not boot correctly

Check:

- `EFI` is enabled
- BIOS virtualization is enabled
- the correct `.vdi` disk is attached

### Add-ons or repositories fail to download

Check the HA VM network configuration first.

Recommended setup:

- `Adapter 1 = NAT`
- `Adapter 2 = Bridged Adapter`

Then verify connectivity from the HA console:

```bash
login
ha network info
ping -c 2 1.1.1.1
ping -c 2 github.com
```

If `github.com` or `ghcr.io` still fails:

- check whether the Windows host has internet access
- disable VPN temporarily
- verify the current network does not block GitHub or container registry access

### Network discovery behaves strangely

Double-check that the VM uses both `NAT` and `Bridged Adapter`, not only one of them.

## After This Guide

Once all three teammates can boot HA locally, continue with:

- [README.md](./README.md)
- [TODO.md](./TODO.md)

## Sources

- Home Assistant Windows install:
  https://www.home-assistant.io/installation/windows/
- Home Assistant installation overview:
  https://www.home-assistant.io/installation/
- Home Assistant supported install direction:
  https://www.home-assistant.io/blog/2025/05/22/deprecating-core-and-supervised-installation-methods-and-32-bit-systems/
