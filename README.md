# Tidal Window Manager
Simple and sane window tiling window manager plugin for gnome shell, with gaps!

## Features
Tidal is intended to be somewhat light on features and only handle the automatic
placement of windows within the desktop. You may move windows to other desktops or
monitors using the mouse (drag and drop) or gnome's built in hotkeys.

Currently only "spiral" tiling is supported, but i3/sway and binary splitting are
options in development.

#### Spiral
![Spiral Example](https://i.imgur.com/W46QTaY.gif)

## Installing
Clone this repo:
```sh
git clone --depth=1 \
    https://github.com/rustysec/tidalwm \
    ~/.local/share/gnome-shell/extensions/tidalwm@rustysec.github.io
```

Logout from current session and login again to start a new session.

Activate with:
```sh
gnome-shell-extension-prefs
```
Some notes about compatibility:
* `gnome-terminal` doesn't behave well, try using alternatives like
[kitty](https://sw.kovidgoyal.net/kitty/),
[alacritty](https://github.com/alacritty/alacritty), or
[termite](https://github.com/thestinger/termite)
* By default TidalWM is configured to use a number of shortcuts that conflict with Gnome defaults, these should be changed or disabled:
    * `Super+L` - Default for "lock the screen"
    * `Super+H` - Default for "hide current window"
    * `Super+Left` - Default for "view split on left"
    * `Super+Right` - Default for "view split on right"
    * `Super+Up` - Default for "maximize window"
    * `Super+Down` - Default for "un-maximize window"

## Current Features
* Automatic spiral tiling
* Adjustable gaps
* Smart gaps
* Inactive window opacity settings
* Active window border option
* Customizable tiling exemption lists
* Customizable hotkeys for floating and rotating order
* Customizable initial split direction (horizontal vs vertical)
* Increase/decrease split values via hotkeys
* Direct window navigation (left, right, above, below) with hotkeys
* **Dynamic workspaces** are now supported!

## Configuration
TidalWM is not as fully featured as something like i3, sway, or bspwm, but there are some quality
of life settings to make it more pleasant to use.

#### Gaps
|Setting|Description|
|-------|-----------|
|`Window Gaps`| The space between windows and the edge of the screen (pixels)|
|`Smart Gaps`| Only apply gaps when more than one window is on the monitor|

#### Windows
|Setting|Description|
|-------|-----------|
|`Inactive Window Opacity`| Sets opacity of any non-focused window, percentage 0-100|
|`Highlight Active Window`| Draw a colored border around the focused window|
|`Active Border Top`|Draw the border along the top of the window|
|`Active Border Right`|Draw the border along the right side of the window|
|`Active Border Bottom`|Draw the border along the bottom of the window|
|`Active Border Left`|Draw the border along the left of the window|
|`Border Width`|Width of the border to draw around window|
|`Border Color`|Can be any valid CSS color, ex: `#00ff00`, `rgba(100, 100, 100, 0.5)`|
|`Always Float`|List of wm classes to exempt from tiling, ex: gnome-calculator,gnome-tweaks|

#### Tiling
|Setting|Description|
|-------|-----------|
|`Spiral`| Use spiral tiling|
|`Binary`| Use binary tiling (_not implemented_)|
|`i3/sway`| Use i3/sway tiling (_not implemented_)|
|`Initial Split Direction`| Which way to perform the first split|

#### Hotkeys 
|Setting|Description|
|-------|-----------|
|`Float Window`|Floats the focused window, ex: `<Ctrl><Alt>f`|
|`Rotate Windows`|Automatically rotate windows through the tiling order, ex: `<Ctrl><Alt>r`|
|`Increase Horizontal Split`|Increase the width of the current window, ex: `<Shift><Super>Right`|
|`Decrease Horizontal Split`|Decrease the width of the current window, ex: `<Shift><Super>Left`|
|`Increase Vertical Split`|Increase the height of the current window, ex: `<Shift><Super>Up`|
|`Decrease Vertical Split`|Decrease the height of the current window, ex: `<Shift><Super><Alt>Down`|
|`Select Window To Above`|Focuses the window directly above the current, ex: `<Super>k,<Super>Up`|
|`Select Window To Below`|Focuses the window directly below the current, ex: `<Super>j,<Super>Down`|
|`Select Window To Left`|Focuses the window directly to the left of the current window, ex: `<Super>h,<Super>Left`|
|`Select Window To Right`|Focuses the window directly to the right of the current, ex: `<Super>l,<Super>Right`|


## FAQ
### Why is this a thing?
This question can probably be broken down into two subquestions:

##### Why not just use a tiling wm?
Well, I do. I love [sway](https://github.com/swaywm/sway). I've used it as my daily driver for a couple of years and it's great.
I'm 100% on board with wayland and use a mix of HiDPI and FHD monitors for my setup and 
Xorg just doesn't work well for me. However, there's some software (i'm looking at you
zoom) that doesn't work (well) on wayland outside of gnome. Switching back and forth between
two environments is a pain, so this became a fun little side project to solve my needs.

##### Why not use Pop-Shell/PaperWM/Gnomesome/Tiling-Gnome/Gtile/etc?
In short: I have used those, and I just wanted something slightly different. All of these
projects are great and have pretty active developers and user bases. But they either lack
features (like gaps or auto tiling) that I want, or they add too much to the gnome workflow
that I don't need or care for.

### What Tidal is _not_
Tidal is not a wholesale abandonment of the gnome ethos. The only behavior this extension
overrides is the window placement. All workspace functionality is still the same.

This began strictly as a productivity hack for myself. I don't play games, and primarily
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
