# Tidal Window Manager
Simple and sane window tiling window manager plugin for gnome shell, with gaps!

## Features
Tidal is intended to be somewhat light on features and only handle the automatic
placing of windows within the desktop. You may move windows to other desktops or
monitors using the mouse (drag and drop) or gnome's built in hotkeys.

Currently only "spiral" tiling is supported, but i3/sway and binary splitting are
options in development.

#### Spiral
![Spiral Example](https://i.imgur.com/i99CRxU.gif)

## Installing
Clone this repo:
```sh
git clone https://github.com/rustysec/tidalwm \
    ~/.local/share/gnome-shell/extensions/tidalwm@rustysec.github.io
```

Logout from current session and login again to start a new session.

Activate with:
```sh
gnome-shell-extension-prefs
```
Some notes about compatibility:
- Tidal does not handle dynamic workspace addition/removal at this time
- **Use static workspaces**
- Please don't try to use dynamic workspaces yet
- Gtk terminals like gnome-terminal and tilix doesn't behave well, try using alternatives like kitty or alacritty

## Shortcuts
#### Float Window
Takes the focused window, removes it from tiling and forces it to be always on top

Ex: `[Ctrl-Alt-f]`

#### Rotate Windows
Reorders the windows within the `spiral` tiling configuration.

Ex: `[Ctrl-Alt-o]`

## FAQ
### Why is this a thing?
This question can probably be broken down into two subquestions:

##### Why not just use a tiling wm?
Well, I do. I love [sway](https://github.com/swaywm/sway). I've used it as my daily driver for a couple of years and it's great.
I'm 100% on board with wayland and use a mix of HiDPI and FHD monitors for my setup and 
Xorg just doesn't work well for me. However, there's some software (i'm looking at you
zoom) that doesn't work (well) on wayland outside of gnome. Switching back and forth between
two environments is a pain, so this became a fun little side project to solve my needs.

##### Why not use PaperWM/Gnomesome/Tiling-Gnome/Gtile/etc?
In short: I have used those, and I just wanted something slightly different. All of these
projects are great and have pretty active developers and user bases. But they either lack
features (like gaps or auto tiling) that I want, or they add too much to the gnome workflow
that I don't need or care for.

### What Tidal is _not_
This began strictly as a productivity hack for me. I don't play games, and primarily
live in the terminal and a browser. It is possible that Tidal is currently not very
compatible with other work flows, so be cautioned! Open an issue and I'll try to 
resolve it if you find some rough edges.

### How Tidal is tested
A lot of other gnome extensions tested have worked great in single monitor situations
but fallen over pretty hard when using multi-monitor configurations. Tidal is tested using a FHD 
laptop panel along with external FHD and 4k monitors.

### Where did this awesome name come from?
Honestly, I'm just _terrible_ at naming things and for some reason this felt like a
good fit.
