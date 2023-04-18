let scanning = false;

const buttonMapping = [
  "A",
  "B",
  "X",
  "Y",
  "LB",
  "RB",
  "LT",
  "RT",
  "Select",
  "Start",
  "Left Stick",
  "Right Stick",
  "Up",
  "Down",
  "Left",
  "Right",
  "XBox"
]

const getButtonName = (buttonIndex, mapping) => {
  if (mapping !== "standard") return "unknown"
  return buttonMapping[buttonIndex] || "unknown"
}

const axisMapping = [
  "Left Horizontally",
  "Left Vertically",
  "Right Horizontally",
  "Right Vertically"
]

const getAxisName = (axisIndex, mapping) => {
  if (mapping !== "standard") return "unknown"
  return axisMapping[axisIndex] || "unknown"
}

const startScanning = (inputsOutput) => {
  if (!scanning) return;

  requestAnimationFrame(() => {
    const connectedGamepads = navigator.getGamepads().filter(gamepad => gamepad !== null)

    connectedGamepads.forEach(gamepad => {
      const pressedInputs = []

      const pressedButtons = gamepad.buttons.map((button, index) => ({ index, button })).filter(config => config.button.pressed)
      pressedInputs.push(...pressedButtons.map(buttonConfig => ({ type: 'button', name: getButtonName(buttonConfig.index, gamepad.mapping), value: buttonConfig.button.value })))

      const usedAxes = gamepad.axes.map((axis, index) => ({ index, axis })).filter(axisConfig => Math.abs(axisConfig.axis) > 0.2)
      pressedInputs.push(...usedAxes.map(axisConfig => ({ type: 'axis', name: getAxisName(axisConfig.index, gamepad.mapping), value: axisConfig.axis })))

      if (pressedInputs.length > 0) {
        const container = document.getElementById(gamepad.id) || document.createElement("p")
        container.setAttribute("id", gamepad.id)

        const gamepadId = document.createElement("strong")
        gamepadId.textContent = gamepad.id

        const inputs = document.createElement("pre")
        inputs.textContent = JSON.stringify(pressedInputs, null, "\t")

        console.log(`Controller ${gamepad.id} has ${pressedButtons.length} pressed buttons and ${usedAxes.length} used axes. (${pressedInputs.map(input => input.name).join(", ")})`)
        container.replaceChildren(gamepadId, inputs)
        if (!inputsOutput.contains(container)) {
          console.log(`Found new controller: ${gamepad.id}`)
          inputsOutput.appendChild(container)
        }
      } else {
        const inputs = document.querySelector(`[id='${gamepad.id}'] pre`)
        if (inputs) {
          inputs.remove()
        }
      }
    })

    startScanning(inputsOutput)
  })
}

document.addEventListener("DOMContentLoaded", () => {
  const detectButton = document.getElementById("detect-inputs")
  const inputsOutput = document.getElementById("pressed-inputs")
  detectButton.addEventListener("click", async () => {
    if (scanning) {
      scanning = false
      detectButton.textContent = "Detect"
      requestAnimationFrame(() => {
        inputsOutput.replaceChildren()
      })
    } else {
      scanning = true
      detectButton.textContent = "Scanning..."
      startScanning(inputsOutput)
    }
  })
})