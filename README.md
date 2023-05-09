# NodeJS Input Research

This documents collects research about how to integrate different input variants (like gamepads or MIDI-controllers) into a NodeJS, more specifically an Electron, application.

## Research on how to implement input variants

### Gamepads

The web specification (W3C) defines a spec to interact with Gamepads. The Gamepad interface is exposed via the Gamepad Javascript API. The Gamepad API adds events to the Window object to read from several gamepads. Additionally, it introduces a Gamepad object, which allows to read the state of a Gamepad (for example pressed buttons). In contrast to the keyboard events that are exposed via events, reading the state of a Gamepad needs the be done manually in a "game loop". The API limits its scope to gamepads only, meaning it only knows simple button presses and axes movements.

The Gamepad API exposes two events on the Window object: `gamepadconnected` and `gamepaddisconnected`. Those events are fired if a new gamepad is connected to or disconnected from the computer.

Note: If a gamepad is already connected when visiting a page, the `gamepadconnected` event will be dispatched, if the user presses a button or moves an axis.

All currently connected gamepads can be read using the `Navigator.getGamepads()` function, that returns an array of Gamepad objects. Each Gamepad object has the following properties:

* id: A not strictly defined identifier that can be used to detect the device (for example the USB vendor and device id).
* index: Unique index in the array of gamepads.
* mapping: A string telling the developer, if the gamepads conforms to a known mapping. Right now there is only one standard mapping. This means if the browser can man the gamepad to the standard mapping, the string will be "standard".
* connected: A boolean indicating if the controller is still connected.
* buttons: An array of buttons that the controller has. Each entry of the list is a javascript object, containing the `pressed` property and the `value` property. The `pressed` property is a boolean that is true if the button is pressed by the user and false otherwise. The `value` property is a float between 0 and 1 which allows the API to support analog buttons.
* axes: An array of axes present on the device. Each entry is a float from -1 to 1.
* timestamp: A timestamp representing the last time, the data from the gamepad was updated.

To sample data from the Gamepad object, the `requestAnimationFrame()` method should be used to allow sampling gamepad inputs at the same sampling rate as animations on the page.

Which gamepads are supported could not be found (yet). However, we can assume that the chromium browser that powers Electron should support all major gamepads.

For reference see:
* [Gamepad API](#ref-gamepad-api)
* [Gamepad Specification](#ref-gamepad-spec)

### Other inputs

As mentioned above, the Gamepad API deliberately limits itself to gamepads with buttons and axes. To make access to other devices possible the W3C designed the WebHID API which can be used to access Human Interface Devices other than gamepads.

With this API one can request a specific device from the browser. If the device is connected one can add an event listener to the device object, which fires every time data was send from the device. This way it's possible to implement drivers for all devices that implement the HID protocol.

Additionally it might be possible to handle inputs from devices that do not support the HID protocol by using either the Web Bluetooth API, the Web Serial API or the WebUSB API.

All those APIs are supported by Electron. To use those APIs it's necessary to implement special events on the main process in Electron.

For reference see:
* [Accessing HID Devices on the Web With the WebHID API](#ref-webhid-paper)
* [Device Access - Electron](#ref-electron-device-access)

## Research on the current state of the TactileCollab project

### Input handling

Currently the TactileCollab project only supports keyboard inputs which exactly one key per configuration. Each configuration can trigger one to five actuators in a specific intensity. They can be configured after entering a room on the right side of the application. All configurations are saved in the configuration file and are loaded on application startup. This means that input configurations are persisted during launches of the program.

When adding a input configuration the user can input various details about the configuration, for example a name, the intensity and so on. Additionally, there is a button that starts scanning for keyboard inputs. On click, the button flips a component boolean attribute. The component has a `keydown` event handler that register key presses if the boolean attribute is true. If a button was pressed, the key will be displayed on the screen and scanning will be stopped.

If the user saves the information by clicking the submit button, all entered data will be submitted to the `PlayGroundActionTypes.addButtonToGrid` store action. This action generates a unique id for the configuration, finds a free spot in the grid and submits the data via the `IPC_CHANNELS.main.saveKeyBoardButton` event to the IPC api. The IPC api persists the configuration into the configuration file. Finally, the state action submits the `PlayGroundMutations.ADD_ITEM_TO_GRID` action in the store which pushes the configuration to the current list of configurations in memory.

Each configuration is stored in an object of the `KeyBoardButton` interface. This interface contains the following attributes:

* `channels`: Array of actuators that should be triggered.
* `color`: The color of the configuration, which is used display the configuration in the application.
* `intensity`: The intensity in which the actuators should be triggered.
* `name`: The name of the configuration.
* `key`: The key that must be pressed (as a string).
* `isActive`: An object storing the current active state of the configuration (more on that later).
* `i`: The generated unique id.
* `x`: The x coordinate of the configuration in the grid.
* `y`: The y coordinate of the configuration in the grid.
* `w`: The width of the configuration in the grid (defaults to 1).
* `h`: The height of the configuration in the grid (defaults to 1).

An input configuration can be used via two actions. The first option is to click on the configuration on the right hand side of the application. The second option is to use the key defined in the configuration. To ensure that the application knows if a configuration is active, the `isActive` object is used. It stores one boolean indicating whether the first option was used called `mouse` and another boolean for the second option called `keyboard`.

The store provides two actions to activate and to deactivate a configuration called `PlayGroundActionTypes.activateKey` and `PlayGroundActionTypes.deactivateKey` respectively. Each action takes two booleans indicating which input option (mouse or keyboard) was used.

The actions first retrieve the configuration by the passed key string. Afterwards it compares the `isActive` state of the configuration to the passed booleans. If the booleans match the action will do nothing. Otherwise it will update the `isActive` state of the configuration with the new booleans. If the configuration was not active before (meaning `mouse` and `keyboard` booleans in the `isActive` object are false) and one of the passed in booleans is true an activation event is emitted to the IPC api. For deactivation the configuration must have been inactive before and one of the passed booleans must be true.

The IPC api handles the input, forwarding the action to the saved actuators and records the action if recording is currently active. It also uses the `key` string in the `updateIntensities` method of the `RoomModule`.

### Installing TactileCollab on Ubuntu

#### Bluetooth

According to the [noble documentation](https://github.com/abandonware/noble#running-on-linux) we need to install some libraries related to bluetooth.

Also noble needs privileges that it can get by running the application with `sudo` or by setting the capabilities of the binary. In the documentation they advise to use `setcap` to set the capabilities of the `node` binary. However in the case of Electron apps this won't work, because Electron runs from its own binary (located in `node_modules/electron/dist/electron`). So we have to grant the capabilities to this binary instead:

```sh
sudo setcap cap_net_raw+eip <PATH_TO_REPO>/frontend/node_modules/electron/dist/electron
```

However, this messes up linking with shared libraries (this seems to be a Linux security feature). We can fix this by adding a custom config file to `/etc/ld.so.conf.d`. For example the file could be named `electron-node.conf` and has to contain the absolute path to the `dist` directory in which the Electron binary is located.

Afterwards, one has to reload the linker using

```sh
sudo ldconfig
```

Note: We will see how this works in the future but I imagine that one has to set the capabilities again, once we update the electron binary.

For reference see:
* [Noble documentation](#ref-noble-documentation)
* [Issue about Noble with Electron](#ref-noble-issue-comment)

### Cannot access resource files

The application communicates with all connected devices using the protobuf protocol. To send such a method protobuf requires a `.proto` file that defines message types to send.

In case of this application the `.proto` file is called `vtproto.proto` and is normally copied to a system-specific resource folder by the electron builder process. However when developing using the development server the file will not be copied which results in an error when trying to load the file.

The solution is to define the path to this file dependent on the node environment. If we are running in production, the file path should point to the resource directory. When not running in production, the path should point the local `src` directory.

```js
const protoPath = process.env.NODE_ENV == "production" ? path.join(process.resourcesPath, "extraResources/vtproto.proto") : "src/protobuf/vtproto.proto";
```

This solution was found in a github issue discussing a similar problem: https://github.com/nklayman/vue-cli-plugin-electron-builder/issues/1026

In the end, this fix is not needed anymore because the project moved away from using protobuf.

### globalstack.at is not a function

After connecting a device and entering the room, the application stopped working and threw a JavaScript error about the `at` function not being defined on some stack object.

The stack object was a plain JavaScript array, but the `at` function on arrays were only implemented since Chrome 92. However, the Chrome binary shipped with the electron version of our application was older and thus does not implement the `at` function.

The function was used by the vuetify package. Due to the `package-lock.json` not being committed to the repository, I downloaded a newer version of this package which required a newer Chrome version. By strictly setting the version of vuetify to an older version, this issue could be fixed.

In the future it would definitely be useful to commit the `package-lock.json` to the repository to avoid such issues.

## PoC: Implementing the Gamepad API in NodeJS

To show off how supporting gamepads would look like, a proof of concept (PoC) should be implemented. The PoC should make it possible to detect button presses and axes movements of all controllers available to the application. The PoC should be implemented as a simple Electron app.

The resulting program can be found in the `poc` folder of this git repository. It can be started using the following commands:

```bash
npm install && npm start
```

When opening, the user gets presented a simple screen telling them what to do in this program and the Developer Tools to see debug information.

![Starting screen of the proof of concept](/images/poc/starting_screen.png)

After clicking on the "Detect" button the program tries to find connected controllers and display pressed buttons or moved axes per controller. Below is a screenshot of two controllers being simultaneously pressed.

![Two controllers each have pressed buttons, that are displayed below the "Detect"-Button](/images/poc/detected_buttons.png)

When clicking on the "Scanning..." button again detecting of button presses will be stopped.

When the "Detect" button is clicked a scanning loop will be started using the `requestAnimationFrame` method, which indicates the browser, that the program wants to perform an animation (in this case displaying information on the screen if needed). This ensures that the scanning takes place at approximately the display refresh rate of the user, which is recommended when processing gamepad input. The end of the loop is controlled by a global `scanning` variable, that will be toggled if the user clicks the "Detect" button.

```js
const startScanning = (inputsOutput) => {
  if (!scanning) return;

  requestAnimationFrame(() => {
    ...
    startScanning(inputsOutput)
  })
}
```

In each iteration, the `navigator.getGamepads()` method gets called which returns an array of `Gamepad` objects. However some items in this array may be `null` indicating disconnected controllers, that should keep their index in the array.

```js
const connectedGamepads =
  navigator.
    getGamepads().
    filter(gamepad => gamepad !== null)
```

After checking for `null` the program iterates the buttons, filters for pressed buttons and stores them into a variable.

```js
connectedGamepads.forEach(gamepad => {
  const pressedInputs = []

  const pressedButtons =
    gamepad.
      buttons.
      map((button, index) => ({ index, button })).
      filter(config => config.button.pressed)

  pressedInputs.push(
    ...pressedButtons.map(buttonConfig => (
      {
        type: 'button',
        name: getButtonName(buttonConfig.index, gamepad.mapping),
        value: buttonConfig.button.value
      }
    )))
  ...
})
```

The program also maps the button index to a mapping name. This name is determined by the `mapping` attribute of the `Gamepad` object. If the attribute is `standard` the program looks up the name in a JavaScript array containing button mappings for a XBox controller. If the index is out of bounds of this array or if the `mapping` attribute is not `standard` the name is unknown. Those mappings does not seem to be publicly available (in form of a NPM library or a data sheet). The only thing that could be found is the [SDL_GameControllerDB](https://github.com/gabomdq/SDL_GameControllerDB) that could be used to generate button mappings for all controllers.

```js
const getButtonName = (buttonIndex, mapping) => {
  if (mapping !== "standard") return "unknown"
  return buttonMapping[buttonIndex] || "unknown"
}
```

After collecting all buttons, all used axes are collected. To avoid the axes being falsely identified as used only an absolute value bigger than 0.2 recognizes an axis as being in use. For a real application, this value may be adjusted or set according to the connected controller. Each axis also gets a name provided by the default mapping as explained above.

```js
const usedAxes =
  gamepad.
    axes.
    map((axis, index) => ({ index, axis })).
    filter(axisConfig => Math.abs(axisConfig.axis) > 0.2)

pressedInputs.push(
  ...usedAxes.map(axisConfig => (
    {
      type: 'axis',
      name: getAxisName(axisConfig.index, gamepad.mapping), value: axisConfig.axis
    }
  )))
```

Afterwards, all objects in `pressedInputs` are rendered into the view, using the gamepad name as a title above.

The name of each gamepad can be obtained by using the `id` attribute of the `Gamepad` object name. As the name suggests, this attribute does provide a human readable but not user friendly name of the connected gamepad. It might be possible to determine a better suited name by using the USB APIs provided via WebUSB or the USB node package. However, both of those approaches require more intensive setup and permissions. For example on most Linux distributions the program needs to ensure that a proper udev rule gets created when installing the program.

After trying out the PoC the following incomplete list of supported gamepads could be made:

| Device                                   | Ubuntu                                           | Windows                                               | MacOS (Intel)                                                                                                                                                     |
|------------------------------------------|--------------------------------------------------|-------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| XBox 360 wired controller                | :white_check_mark:                               | :white_check_mark:                                    | :negative_squared_cross_mark: (no native support, [3rd party drivers](https://github.com/360Controller/360Controller) deprecated starting with MacOS 11 Big Sur)  |
| XBox wireless controller                 | :white_check_mark: (after a firmware update)     | :white_check_mark: (same id as XBox 360 Controller)   | :white_check_mark:                                                                                                                                                |
| Nintendo Switch Pro Controller / Joycons | :negative_squared_cross_mark: (work in Firefox)  |                                                       |                                                                                                                                                                   |
| Sony Dualshock 4                         |                                                  |                                                       | :white_check_mark:                                                                                                                                                |                                                                                                                  |   |                                                       |   :white_check_mark:    |


## Expanding the input handling of TactileCollab

### Requirements

- [ ] Support one or more input devices.
- [ ] Keep support for keyboards.
- [ ] Support most used gamepads (XBox and PlayStation)
- [ ] Support scanning for inputs on newly plugged in gamepads without restarting the application.
- [ ] Support multiple different gamepads in one session.
- [ ] Support multiple same gamepads on one session if possible.
- [ ] Store configured input bindings in a configuration file.
- [ ] Load stored input bindings on application start and assign them to connected input devices.

### Architecture

#### Input detection

The main goal of the proposed architecture is to abstract away the different ways of interacting with all supported input devices. This can be achieved by implementing the `InputAdapter` interface for each type of device. Those adapter classes can be used to detect the input of the user.

The `InputDetection` class is used to communicate with multiple adapters at once and start detecting user inputs. If an adapter signals a user input, the user provided `onInput` callback is fired with an `InputEvent` object.

An input event contains information about the device and the input that the user provided. Additionally it contains a value that gives information about analog input methods (i.e. analog sticks or back buttons).

The device and the user input each provide a `type` property that can be used to implement a [type predicate](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates) to differentiate between the different device and input type interfaces.

In Javascript class based architectures are pretty uncommon. Because of this the whole architecture could be based on modules instead.

```mermaid
classDiagram
  direction LR
  class InputDetection {
    -defaultConfiguration()$ InputDetectionConfig

    -InputDetectionConfig config
    +constructor(config: InputDetectionConfig): InputDetection
    +start() void
    +stop() void
  }

  class InputAdapterConfig {
    +number axesThreshold
    +number buttonThreshold
    +InputEvent => void onInput
  }

  class InputDetectionConfig {
    +InputAdapter[] adapters
  }
  InputDetectionConfig <|-- InputAdapterConfig

  class InputAdapter {
    #InputAdapterConfig config
    +constructor(config: InputAdapterConfig)
    +startDetection() void
    +stopDetection() void
  }

  class GamepadAdapter {
    +startDetection() void
    +stopDetection() void
  }

  class KeyboardAdapter {
    +startDetection() void
    +stopDetection() void
  }

  GamepadAdapter <|-- InputAdapter
  KeyboardAdapter <|-- InputAdapter

  class InputEvent {
    +InputDevice device
    +UserInput input
    +number value
  }

  class InputDevice {
    <<interface>>

    +string type
  }

  class GamepadDevice {
    +string type = "gamepad"
    +string name
    +number index
  }

  class KeyboardDevice {
    +string type = "keyboard"
  }

  GamepadDevice ..|> InputDevice
  KeyboardDevice ..|> InputDevice

  class UserInput {
    <<interface>>

    +string type
  }

  class KeyInput {
    +string type = "key"
    +string key
  }

  class GamepadButtonInput {
    +string type = "gamepad_button"
    +number index
    +getName() string
  }

  class GamepadAxisInput {
    +string type = "gamepad_axis"
    +number index
    +getName() string
  }

  KeyInput ..|> UserInput
  GamepadButtonInput ..|> UserInput
  GamepadAxisInput ..|> UserInput
```

To communicate with the above described API, the API user instantiates a new `InputDetection`. The passed configuration object should contain the `onInput` callback that will be invoked whenever one of the adapters register a user input. The detection class takes care of instantiating the requested adapters.

Now the API user can start a detection by calling the `start()` method on the detection instance. This will start detection in all input adapters. Once a user input is registered by one of the adapters the `onInput` callback will be triggered.

The API user can stop detection at any time using the `stop()` method on the detection instance. After calling `stop()` the `onInput` callback will not be invoked again.

If needed the detection can be resumed and stopped again at any time.

A typical communication sequence is depicted in the below sequence diagram:


```mermaid
sequenceDiagram
  User ->> InputDetection: const detection = new InputDetection({ onInput })
  InputDetection ->> KeyboardAdapter: new KeyboardAdapter({ onInput })
  InputDetection ->> GamepadAdapter: new GamepadAdapter({ onInput })

  Note over User, GamepadAdapter: Start detection
  User ->> InputDetection: detection.start()
  InputDetection ->> KeyboardAdapter: keyboardAdapter.startDetection()
  InputDetection ->> GamepadAdapter: gamepadAdapter.startDetection()

  Note over User, GamepadAdapter: Key pressed on keyboard
  KeyboardAdapter ->> InputDetection: onInput(inputEvent)
  InputDetection ->> User: onInput(inputEvent)

  Note over User, GamepadAdapter: Button pressed on gamepad
  GamepadAdapter ->> InputDetection: onInput(inputEvent)
  InputDetection ->> User: onInput(inputEvent)

  Note over User, GamepadAdapter: Stop detection
  User ->> InputDetection: detection.stop()
  InputDetection ->> KeyboardAdapter: adapter.stopDetection()
  KeyboardAdapter ->> GamepadAdapter: adapter.stopDetection()
```


#### Saving input bindings

User inputs are used to trigger specific actions in the application. The combination of an user input and a list of actions are represented by the `InputBinding` object.

Each `InputBinding` gets a unique id at creation time. This is used to identify each binding in the application. Additionally, the user can choose a name for the binding and a color which is used to display the binding to the user. After creating a binding it is displayed on a grid. The grid position is also stored in the binding object. Finally, each binding object knows  which inputs trigger it's actions and which actions it should perform.

All bindings are grouped by their device. This means there is one `InputDeviceBindings` object for each device that contains the bindings that are defined for the specific device. In the configuration file those should be used as the top-level data structure.

Each action is identified by a `TactileAction` instance. Currently there is only one type of action - a `TriggerActuatorAction` - that triggers one specific actuator with a specific intensity. Later on other actions could be added by extending the `TactileAction` type.

To save the device binding objects to disk one can use the built-in functions `JSON.stringify(obj)` and `JSON.parse(str)`.

An overview of all related classes and objects can be found in the diagram below:


```mermaid
classDiagram
  direction TB
  class InputDeviceBindings {
    +InputDevice device
    +InputBinding[] bindings
  }

  class InputBinding {
    +string uid
    +string? name
    +string color
    +GridPosition position
    +UserInput[] input
    +TactileAction[] actions
  }

  class GridPosition {
    +number x
    +number y
    +number w
    +number h
  }

  class TactileAction {
    <<interface>>

    +string type
  }

  class TriggerActuatorAction {
    +string type = "trigger_actuator"
    +number channel
    +number intensity
  }
  TriggerActuatorAction ..|> TactileAction
```

## Further Reading

* [Ha Dou Ken Music: Different mappings to play music with joysticks](https://www.researchgate.net/profile/Flavio-Schiavoni/publication/343797776_Ha_Dou_Ken_Music_Different_mappings_to_play_music_with_joysticks/links/5f403ad1a6fdcccc43e3e3ab/Ha-Dou-Ken-Music-Different-mappings-to-play-music-with-joysticks.pdf)
* [Web MIDI API](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API)
* [joypad.js - JavaScript library that lets you connect and use various gaming controllers [...]](https://github.com/ArunMichaelDsouza/joypad.js)

## References

* <a name="ref-gamepad-api">Using the Gamepad API - MDN</a> - <https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API>
* <a name="ref-gamepad-spec">Gamepad - World Wide Web Consortium (W3C)</a> - <https://w3c.github.io/gamepad>
* <a name="ref-webhid-api">Accessing HID Devices on the Web With the WebHID API - Thomas Steiner and François Beaufort</a> - <https://arxiv.org/pdf/2104.02392.pdf>
* <a name="ref-electron-device-access">Device Access - Electron</a> - <https://www.electronjs.org/de/docs/latest/tutorial/devices>
* <a name="ref-noble-documentation">noble Documentation - GitHub</a> - <https://github.com/abandonware/noble>
* <a name="ref-noble-issue-comment">Issue comment about noble with Electron - GitHub</a> - <https://github.com/noble/bleno/issues/282#issuecomment-341364657>
