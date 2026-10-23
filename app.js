const dropArea = document.getElementById("drop-area");
const fileInput = document.getElementById("file-input");
const selectFileButton = document.getElementById("select-file-button");
const status = document.getElementById("status");
const previewSection = document.getElementById("preview-section");
const previewTableBody = document.querySelector("#preview-table tbody");
const csvOutput = document.getElementById("csv-output");
const copyButton = document.getElementById("copy-button");
const previewFilename = document.getElementById("preview-filename");

function updateStatus(message, isError = false) {
    status.textContent = message;
    status.style.color = isError ? "#b91c1c" : "#111827";
}

function convertJsonToCsv(data) {
    const lines = [];
    const definitions = data.definitions || {};
    let baseName = "saida";

    for (const nomeCaminho in definitions) {
        if (!Object.prototype.hasOwnProperty.call(definitions, nomeCaminho)) {
            continue;
        }
        if (nomeCaminho.includes("_Delta")) {
            continue;
        }
        if (baseName === "saida") {
            baseName = nomeCaminho.replace(/^DLF_/, "").replace(/_Delta$/, "");
        }

        const elements = definitions[nomeCaminho].elements || {};
        for (const campoNome in elements) {
            if (!Object.prototype.hasOwnProperty.call(elements, campoNome)) {
                continue;
            }
            const campoProps = elements[campoNome] || {};
            const businessName = campoProps["@EndUserText.label"] || campoNome;
            const technicalName = campoNome;
            const rawType = String(campoProps.type || "").replace(/^cds\./, "");
            let typeLabel = rawType;

            if (rawType === "String") {
                typeLabel = `${rawType}(${campoProps.length || ""})`;
            } else if (rawType === "Decimal") {
                typeLabel = `${rawType}(${campoProps.precision || ""},${campoProps.scale || ""})`;
            }

            lines.push(`${nomeCaminho};${businessName};${technicalName};${typeLabel}`);
        }
    }

    lines.push(`DLF_${baseName};Delta padrão - Tipo da alteração do registro (Change_Type);Change_Type;String (1)`);
    lines.push(`DLF_${baseName};Delta padrão - Data da alteração do registros (Change_Date);Change_Date;Timestamp`);

    return {
        csv: lines.join("\n"),
        filename: `DLF_${baseName}.csv`,
    };
}

function showPreview(csvText, previewRows, filename) {
    previewTableBody.innerHTML = "";
    previewRows.forEach((row) => {
        const tr = document.createElement("tr");
        row.forEach((cell) => {
            const td = document.createElement("td");
            td.textContent = cell;
            tr.appendChild(td);
        });
        previewTableBody.appendChild(tr);
    });
    csvOutput.value = csvText;
    previewFilename.textContent = `Arquivo: ${filename}`;
    previewSection.classList.remove("hidden");
}

function handleFiles(files) {
    if (!files || files.length === 0) {
        updateStatus("Nenhum arquivo selecionado.", true);
        return;
    }
    const file = files[0];
    if (!file.type.includes("json") && !file.name.endsWith(".json")) {
        updateStatus("Selecione um arquivo JSON válido.", true);
        return;
    }

    updateStatus(`Lendo ${file.name}...`);
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const json = JSON.parse(reader.result);
            const result = convertJsonToCsv(json);
            const previewRows = result.csv.split("\n").slice(0, 10).map((line) => line.split(";"));
            showPreview(result.csv, previewRows, result.filename);
            updateStatus("Arquivo processado com sucesso.");
        } catch (err) {
            updateStatus("Erro ao processar JSON: arquivo inválido.", true);
            previewSection.classList.add("hidden");
            csvOutput.value = "";
        }
    };
    reader.onerror = () => {
        updateStatus("Erro ao ler o arquivo.", true);
    };
    reader.readAsText(file, "UTF-8");
}

selectFileButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (event) => handleFiles(event.target.files));

["dragenter", "dragover"].forEach((eventName) => {
    dropArea.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();
        dropArea.classList.add("dragover");
    });
});

["dragleave", "drop"].forEach((eventName) => {
    dropArea.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();
        dropArea.classList.remove("dragover");
    });
});

dropArea.addEventListener("drop", (event) => {
    const files = event.dataTransfer.files;
    handleFiles(files);
});

copyButton.addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(csvOutput.value);
        updateStatus("CSV copiado para a área de transferência.");
    } catch (error) {
        updateStatus("Falha ao copiar. Tente novamente.", true);
    }
});
