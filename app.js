const form = document.getElementById("exercise-form");
const examplesContainer = document.getElementById("examples");
const addExampleBtn = document.getElementById("add-example");
const exampleTemplate = document.getElementById("example-template");
const argumentCountInput = document.getElementById("argument-count");
const argumentDefinitionsContainer = document.getElementById("argument-definitions");
const argumentDefinitionTemplate = document.getElementById("argument-definition-template");
const outputKindSelect = document.getElementById("output-kind");
const canvas = document.getElementById("diagram-canvas");
const statusEl = document.getElementById("status");
const downloadPngBtn = document.getElementById("download-png");

const ctx = canvas.getContext("2d");

bootstrap();

function bootstrap() {
  syncArgumentDefinitions(getArgumentCount());
  addExampleRow();

  addExampleBtn.addEventListener("click", () => {
    addExampleRow();
  });

  argumentCountInput.addEventListener("change", () => {
    syncArgumentDefinitions(getArgumentCount());
    syncExampleInputsWithDefinitions();
  });

  argumentCountInput.addEventListener("input", () => {
    const count = Math.max(0, Number(argumentCountInput.value || 0));
    argumentCountInput.value = String(count);
  });

  argumentDefinitionsContainer.addEventListener("change", (event) => {
    if (!(event.target instanceof HTMLSelectElement)) {
      return;
    }

    if (event.target.classList.contains("argument-kind")) {
      syncExampleInputsWithDefinitions();
    }
  });

  examplesContainer.addEventListener("click", (event) => {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }

    if (event.target.classList.contains("remove-example")) {
      const row = event.target.closest(".example-row");
      if (row) {
        row.remove();
      }
    }
  });

  downloadPngBtn.addEventListener("click", () => {
    const link = document.createElement("a");
    link.download = "exercise-diagram.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });

  form.addEventListener("submit", handleSubmit);
}

function handleSubmit(event) {
  event.preventDefault();

  try {
    const functionName = document.getElementById("function-name").value.trim();
    const additionalNotes = document.getElementById("additional-notes").value.trim();
    const argumentKinds = getArgumentKinds();
    const outputKind = outputKindSelect.value;

    if (!functionName) {
      throw new Error("Function name is required.");
    }

    const examples = collectExamples(argumentKinds, outputKind);
    if (examples.length === 0) {
      throw new Error("Add at least one valid example.");
    }

    drawDiagram(functionName, argumentKinds, examples, additionalNotes);
    setStatus(`Generated ${examples.length} component${examples.length > 1 ? "s" : ""}.`, "success");
    downloadPngBtn.disabled = false;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate diagram.";
    setStatus(message, "error");
    downloadPngBtn.disabled = true;
  }
}

function setStatus(message, variant) {
  statusEl.textContent = message;
  statusEl.classList.remove("status--success", "status--error");

  if (variant === "success") {
    statusEl.classList.add("status--success");
    return;
  }

  if (variant === "error") {
    statusEl.classList.add("status--error");
  }
}

function getArgumentCount() {
  return Math.max(0, Number(argumentCountInput.value || 0));
}

function syncArgumentDefinitions(count) {
  const previousKinds = getArgumentKinds();
  argumentDefinitionsContainer.innerHTML = "";

  for (let i = 0; i < count; i += 1) {
    const fragment = argumentDefinitionTemplate.content.cloneNode(true);
    const title = fragment.querySelector(".argument-title");
    const kindSelect = fragment.querySelector(".argument-kind");

    title.textContent = `Argument ${i + 1} kind`;
    kindSelect.value = previousKinds[i] || "array";
    argumentDefinitionsContainer.appendChild(fragment);
  }
}

function getArgumentKinds() {
  return [...argumentDefinitionsContainer.querySelectorAll(".argument-kind")].map((el) => el.value);
}

function addExampleRow(existingInputValues = [], existingOutputValue = "") {
  const fragment = exampleTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".example-row");
  const inputsWrap = row.querySelector(".example-inputs");
  const outputInput = row.querySelector(".example-output");
  const argumentKinds = getArgumentKinds();

  renderExampleInputs(inputsWrap, argumentKinds, existingInputValues);
  outputInput.value = existingOutputValue;
  examplesContainer.appendChild(fragment);
}

function syncExampleInputsWithDefinitions() {
  const argumentKinds = getArgumentKinds();
  const rows = [...examplesContainer.querySelectorAll(".example-row")];

  rows.forEach((row) => {
    const existingValues = [...row.querySelectorAll(".example-arg-input")].map((el) => el.value);
    const inputsWrap = row.querySelector(".example-inputs");
    renderExampleInputs(inputsWrap, argumentKinds, existingValues);
  });
}

function renderExampleInputs(inputsWrap, argumentKinds, existingValues = []) {
  inputsWrap.innerHTML = "";

  argumentKinds.forEach((kind, index) => {
    const label = document.createElement("label");
    const span = document.createElement("span");
    const input = document.createElement("input");

    span.textContent = `Arg ${index + 1} (${kind})`;
    input.className = "example-arg-input";
    input.dataset.argIndex = String(index);
    input.type = "text";
    input.placeholder = kind === "array" ? "{1, 2, 3} or new int[0]" : "2";
    input.value = existingValues[index] || "";

    label.appendChild(span);
    label.appendChild(input);
    inputsWrap.appendChild(label);
  });
}

function collectExamples(argumentKinds, outputKind) {
  const rows = [...examplesContainer.querySelectorAll(".example-row")];

  return rows
    .map((row, rowIndex) => {
      const argInputs = [...row.querySelectorAll(".example-arg-input")];
      const outputRaw = row.querySelector(".example-output").value.trim();

      if (!outputRaw) {
        return null;
      }

      const inputs = argInputs.map((inputEl, argIndex) => {
        const raw = inputEl.value.trim();
        if (!raw) {
          throw new Error(`Example ${rowIndex + 1}: argument ${argIndex + 1} is empty.`);
        }

        return parseValue(raw, argumentKinds[argIndex], `example ${rowIndex + 1} argument ${argIndex + 1}`);
      });

      const output = parseValue(outputRaw, outputKind, `example ${rowIndex + 1} output`);
      return { inputs, output };
    })
    .filter(Boolean);
}

function parseValue(raw, kind, label) {
  if (kind === "array") {
    const constructorMatch = raw.trim().match(/^new\s+int\s*\[\s*(-?\d+)\s*\]$/i);
    if (constructorMatch) {
      const size = Number(constructorMatch[1]);
      return {
        type: "array-constructor",
        size,
        text: `new int[${size}]`,
      };
    }

    const normalized = raw
      .replace(/^\s*\{/, "[")
      .replace(/\}\s*$/, "]")
      .trim();

    if (!normalized.startsWith("[") || !normalized.endsWith("]")) {
      throw new Error(`Expected ${label} as array (e.g. {1,2,3} or new int[0]).`);
    }

    let parsed;
    try {
      parsed = JSON.parse(normalized);
    } catch {
      throw new Error(`Could not parse ${label} array.`);
    }

    if (!Array.isArray(parsed)) {
      throw new Error(`Expected ${label} as array.`);
    }

    return parsed.map((item) => normalizeScalar(item));
  }

  return normalizeScalar(raw);
}

function normalizeScalar(value) {
  if (typeof value === "number") {
    return value;
  }

  const text = String(value).trim();
  if (/^-?\d+(\.\d+)?$/.test(text)) {
    return Number(text);
  }

  return text.replace(/^"|"$/g, "");
}

function drawDiagram(functionName, argumentKinds, examples, additionalNotes) {
  const layout = computeLayout(argumentKinds.length, examples, additionalNotes);
  canvas.width = layout.width;
  canvas.height = layout.height;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let currentY = layout.topPadding;
  for (const example of examples) {
    drawComponent(functionName, example, currentY, layout);
    currentY += layout.componentHeight + layout.componentGap;
  }

  if (layout.noteLines.length > 0) {
    drawAdditionalNotes(layout.noteLines, layout.width, layout.notesTop);
  }
}

function computeLayout(argumentCount, examples, additionalNotes) {
  const cellSize = 42;
  const cellGap = 8;
  const leftMargin = 28;
  const rightMargin = 28;
  const arrowGap = 22;
  const boxWidth = 160;
  const boxHeight = 58;
  const laneGap = 62;
  const componentHeight = Math.max(120, 80 + (argumentCount - 1) * laneGap);
  const componentGap = 28;
  const topPadding = 22;

  const inputWidth = Math.max(
    ...examples.flatMap((example) =>
      example.inputs.map((value) => getValueRenderWidth(value, cellSize, cellGap))
    ),
    1
  );

  const outputWidth = Math.max(
    ...examples.map((example) => getValueRenderWidth(example.output, cellSize, cellGap)),
    1
  );

  const width =
    leftMargin +
    inputWidth +
    arrowGap +
    boxWidth +
    arrowGap +
    outputWidth +
    rightMargin;

  const finalWidth = Math.max(width, 860);
  const noteLines = getWrappedNotesLines(additionalNotes, finalWidth - 56);
  const notesBlockHeight = noteLines.length > 0 ? 10 + noteLines.length * 18 + 8 : 0;

  const height =
    topPadding * 2 +
    examples.length * componentHeight +
    (examples.length - 1) * componentGap +
    notesBlockHeight;

  return {
    width: finalWidth,
    height,
    cellSize,
    cellGap,
    leftMargin,
    rightMargin,
    arrowGap,
    boxWidth,
    boxHeight,
    componentHeight,
    componentGap,
    topPadding,
    laneGap,
    inputWidth,
    outputWidth,
    noteLines,
    notesTop:
      topPadding + examples.length * componentHeight + (examples.length - 1) * componentGap + 20,
  };
}

function getWrappedNotesLines(notesText, maxWidth) {
  if (!notesText) {
    return [];
  }

  ctx.save();
  ctx.font = '600 13px "Space Grotesk", sans-serif';

  const words = notesText.split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || currentLine === "") {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  ctx.restore();
  return lines;
}

function getValueRenderWidth(value, cellSize, cellGap) {
  if (isArrayConstructor(value)) {
    return Math.max(110, value.text.length * 11);
  }

  if (Array.isArray(value)) {
    const cellCount = Math.max(1, value.length);
    return cellCount * cellSize + (cellCount - 1) * cellGap;
  }

  return Math.max(42, String(value).length * 14);
}

function drawComponent(functionName, example, y, layout) {
  const midY = y + layout.componentHeight / 2;
  const inputYs = getInputLaneYs(example.inputs.length, midY, layout.laneGap);

  const boxX = layout.leftMargin + layout.inputWidth + layout.arrowGap;
  const outputWidth = getValueRenderWidth(example.output, layout.cellSize, layout.cellGap);
  const outputX =
    boxX + layout.boxWidth + layout.arrowGap + (layout.outputWidth - outputWidth) / 2;

  example.inputs.forEach((inputValue, index) => {
    const inputWidth = getValueRenderWidth(inputValue, layout.cellSize, layout.cellGap);
    const inputX = layout.leftMargin + (layout.inputWidth - inputWidth) / 2;
    const inputY = inputYs[index];
    const cellsY = inputY - layout.cellSize / 2;
    const arrowTargetY = example.inputs.length > 1 ? midY : inputY;

    drawValue(inputValue, inputX, cellsY, inputY, layout.cellSize, layout.cellGap);
    drawArrow(inputX + inputWidth + 2, inputY, boxX - 6, arrowTargetY, "#e67e22");
  });

  drawFunctionBox(
    `${functionName}()`,
    boxX,
    midY - layout.boxHeight / 2,
    layout.boxWidth,
    layout.boxHeight
  );

  drawArrow(boxX + layout.boxWidth + 6, midY, outputX - 2, midY, "#111111");

  const outputCellsY = midY - layout.cellSize / 2;
  drawValue(example.output, outputX, outputCellsY, midY, layout.cellSize, layout.cellGap);
}

function getInputLaneYs(argumentCount, midY, laneGap) {
  if (argumentCount === 1) {
    return [midY];
  }

  const start = midY - ((argumentCount - 1) * laneGap) / 2;
  return Array.from({ length: argumentCount }, (_, i) => start + i * laneGap);
}

function drawValue(value, x, cellsY, midY, cellSize, cellGap) {
  if (isArrayConstructor(value)) {
    drawScalar(value.text, x, midY + 7);
    return;
  }

  if (Array.isArray(value)) {
    drawCells(value.map((v) => String(v)), x, cellsY, cellSize, cellGap);
    return;
  }

  drawScalar(String(value), x + 8, midY + 7);
}

function isArrayConstructor(value) {
  return value && typeof value === "object" && value.type === "array-constructor";
}

function drawCells(values, x, y, size, gap) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = "#111111";
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = 2;

  values.forEach((value, index) => {
    const cellX = x + index * (size + gap);
    ctx.fillRect(cellX, y, size, size);
    ctx.strokeRect(cellX, y, size, size);

    const fontSize = value.length > 7 ? 9 : value.length > 4 ? 14 : 18;
    ctx.font = `600 ${fontSize}px "Space Grotesk", sans-serif`;
    ctx.fillStyle = "#111111";
    ctx.fillText(value, cellX + size / 2, y + size / 2 + 1);
    ctx.fillStyle = "#ffffff";
  });
}

function drawScalar(value, x, y) {
  ctx.fillStyle = "#111111";
  ctx.font = '700 24px "Space Grotesk", sans-serif';
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(String(value), x, y);
}

function drawFunctionBox(label, x, y, width, height) {
  ctx.fillStyle = "#111111";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.font = '700 20px "Bricolage Grotesque", "Space Grotesk", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + width / 2, y + height / 2 + 1);
}

function drawAdditionalNotes(noteLines, canvasWidth, topY) {
  ctx.fillStyle = "#111111";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  ctx.font = '700 13px "Bricolage Grotesque", "Space Grotesk", sans-serif';
  ctx.fillText("Additional notes:", 28, topY);

  ctx.font = '600 13px "Space Grotesk", sans-serif';
  noteLines.forEach((line, index) => {
    ctx.fillText(line, 28, topY + 17 + index * 18, canvasWidth - 56);
  });
}

function drawArrow(x1, y1, x2, y2, color) {
  const headLen = 10;
  const angle = Math.atan2(y2 - y1, x2 - x1);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.4;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * Math.cos(angle - Math.PI / 7),
    y2 - headLen * Math.sin(angle - Math.PI / 7)
  );
  ctx.lineTo(
    x2 - headLen * Math.cos(angle + Math.PI / 7),
    y2 - headLen * Math.sin(angle + Math.PI / 7)
  );
  ctx.closePath();
  ctx.fill();
}
