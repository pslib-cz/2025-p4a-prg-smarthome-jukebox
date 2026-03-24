# Home Assistant Setup On Windows With VirtualBox

Last updated: 2026-03-24

This guide is the shared team setup path for running `Home Assistant OS` locally on a Windows machine with `VirtualBox`.

Use this guide if you want a stable development environment with:

- Home Assistant
- MQTT later
- Music Assistant later
- the option to move the same HA setup to dedicated hardware after development

## Why This Path

Recommended team baseline:

- host machine: `Windows`
- virtualization: `VirtualBox`
- install type: `Home Assistant OS`

Do **not** use `WSL` as the main Home Assistant runtime for this project.

Why:

- `Home Assistant OS` is the most straightforward path for apps/add-ons
- `Music Assistant` fits better into this setup later
- the team needs a repeatable setup, not a custom one-off environment

## Before You Start

You need:

- a Windows machine
- `VirtualBox` installed
- hardware virtualization enabled in BIOS/UEFI if VirtualBox complains
- at least `2 GB RAM` and `2 vCPU` available for the VM

Recommended for this project:

- `4 GB RAM`
- `2 vCPU`

Reason:
- This is an inference, not an official hard requirement.
- The official Home Assistant minimum is lighter, but this project will likely add MQTT and Music Assistant, so more headroom is safer.

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

If the VM later refuses to boot, re-check that virtualization is enabled in BIOS/UEFI.

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

Set:

- `Attached to`: `Bridged Adapter`
- `Name`: your active network adapter

Why:

- the VM should appear on your local network
- Home Assistant discovery and local integrations work more cleanly this way

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
- or inspect your router / local network client list

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
2. `Music Assistant`

Official Music Assistant docs:

- server install: https://www.music-assistant.io/installation/
- Home Assistant integration: https://www.music-assistant.io/integration/installation/

Do not start custom frontend binding until at least:

- Home Assistant boots reliably
- you can log in after restart
- you know the VM IP or hostname

## Recommended Team Rule

Each teammate should do this once:

1. boot Home Assistant successfully
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

### Network discovery behaves strangely

Double-check that the VM uses `Bridged Adapter`, not just the default NAT mode.

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
- Music Assistant install:
  https://www.music-assistant.io/installation/
- Music Assistant HA integration:
  https://www.music-assistant.io/integration/installation/
