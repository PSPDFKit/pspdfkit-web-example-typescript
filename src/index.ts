/* eslint-disable @typescript-eslint/no-explicit-any */
import PSPDFKit from "@nutrient-sdk/viewer";

let instance: any = null;
let highlightedElement: HTMLElement | null = null; 

function createLeftPanel() {
  const leftPanel = document.createElement("div");
  leftPanel.id = "left-panel"; // Set an ID for styling later
  leftPanel.style.width = "250px"; // Set the left panel width
  leftPanel.style.height = "100vh"; // Full height of the viewport
  leftPanel.style.overflowY = "auto"; // Allow scrolling if content exceeds height
  leftPanel.style.padding = "10px";
  leftPanel.style.backgroundColor = "#f4f4f4";
  leftPanel.style.borderRight = "1px solid #ccc";

  // Create file input and add it to the left panel
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.className = "chooseFile";
  fileInput.accept = "application/pdf";
  fileInput.style.marginBottom = "10px"; // Add some space below the input

  // Add event listener for file input change
  fileInput.addEventListener("change", function (event: HTMLInputEvent) {
    if (event.target && event.target.files instanceof FileList) {
      PSPDFKit.unload(".container");

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }

      objectUrl = URL.createObjectURL(event.target.files[0]);
      load(objectUrl);
    }
  });

  leftPanel.appendChild(fileInput); // Add file input to the left panel
  leftPanel.innerHTML += "<h3>Extracted Text</h3>";
  const textContainer = document.createElement("div");
  textContainer.id = "text-container";
  leftPanel.appendChild(textContainer); // Add text container to the left panel

  document.body.appendChild(leftPanel);
}

function load(pdfDocument: string) {
  console.log(`Loading ${pdfDocument}...`);
  
  // Create the left panel for extracted text
  createLeftPanel();

  // Apply flexbox to create the layout
  document.body.style.display = "flex";
  document.body.style.flexDirection = "row"; // Align items side by side
  document.body.style.margin = "0"; // Remove default margin
  document.body.style.padding = "0"; // Remove default padding

  const container = document.createElement("div");
  container.classList.add("container");

  // Create the PSPDFKit viewer container on the right
  const viewerContainer = document.createElement("div");
  viewerContainer.classList.add("viewer-container");
  viewerContainer.style.flexGrow = "1"; // Allow it to take up remaining space

  document.body.appendChild(viewerContainer);

  PSPDFKit.load({
    document: pdfDocument,
    container: viewerContainer,
    baseUrl: "",
    toolbarItems: [
      {
        type: "custom",
        title: "Random redaction",
        className: "randomRedaction",
        onPress: () => {
          if (!instance) return;

          // Get page 0 dimensions
          const { width, height } = instance.pageInfoForIndex(0);
          // Create a redaction annotation in page 0 with random position and dimensions
          const left = Math.random() * (width - PSPDFKit.Options.MIN_SHAPE_ANNOTATION_SIZE);
          const top = Math.random() * (height - PSPDFKit.Options.MIN_SHAPE_ANNOTATION_SIZE);
          
          const redaction = new PSPDFKit.Annotations.RedactionAnnotation({
            pageIndex: 0,
            boundingBox: new PSPDFKit.Geometry.Rect({
              left,
              top,
              width: Math.random() * (width - left),
              height: Math.random() * (height - top),
            }),
          });

          instance.create(redaction);
        },
      },
      { 
        type: "redact-rectangle",
        className: "redactRectangle",
        
      }, 
      {
        type: "custom",
        id: "apply-redactions",
        title: "Apply All Redactions",
         className: "applyRedactions",
        onPress: () => {
          instance.applyRedactions();
        }
      },
    ],
    styleSheets: [
      "index.css" // or local CSS file
    ]
  })
    .then((_instance) => {
      instance = _instance;
      _instance.addEventListener("annotations.change", () => {
        console.log(`${pdfDocument} loaded!`);
      });

      _instance.setViewState(viewState => (
        viewState.set("keepSelectedTool", true)
     ));

      // Set up redaction event listener
      _instance.addEventListener("annotations.create", async (createdAnnotations) => {
        for (const annotation of createdAnnotations) {
          if (annotation instanceof PSPDFKit.Annotations.RedactionAnnotation) {
            const text = await instance.getMarkupAnnotationText(annotation);
            console.log("Text behind redaction:", text);

            const redactionId = annotation.id;
            // console.log("Redaction annotation ID:", redactionId);

            // Display the extracted text on the left panel
            const textContainer = document.getElementById("text-container") as HTMLElement;
            if (textContainer) {
              const textElement = document.createElement("div");
              textElement.textContent = text;
              textElement.id=redactionId;
              textElement.style.display = "flex"; // Use flexbox for alignment
              textElement.style.justifyContent = "space-between"; // Space between text and button
              textElement.style.alignItems = "center"; // Center align items vertically


              const trashButton = document.createElement("button");
              trashButton.innerHTML = '<i class="fas fa-trash"></i>'; // Font Awesome trash icon
              trashButton.className = "trash-button"; // Add a class for styling
              trashButton.style.cursor = "pointer"; // Change cursor to pointer

              trashButton.addEventListener("click", () => {
                handleTrashClick(redactionId);
              });

              textElement.appendChild(trashButton);

              // Add click event listener to the text element
              textElement.style.cursor = "pointer"; // Change cursor to pointer
              textElement.addEventListener("click", (e: MouseEvent) => {
                selectAnnotationById(redactionId);

                e.stopPropagation(); // Prevent the click event from bubbling up to the document

                // Remove highlight from the previously highlighted element
                if (highlightedElement) {
                  highlightedElement.classList.remove("highlight");
                }

                // Highlight the clicked text element
                highlightedElement = textElement;
                highlightedElement.classList.add("highlight");
              });

              textContainer.appendChild(textElement);
            }
          }
        }
      });
    })
    .catch(console.error);
}

function handleTrashClick(annotationId: string) {
  if (instance) {
    instance.delete(annotationId);
  }
  const textDiv= document.getElementById(annotationId);
  textDiv.remove();
}

document.addEventListener("click", () => {
  if (highlightedElement) {
    highlightedElement.classList.remove("highlight");
    highlightedElement = null; // Reset the highlighted element
  }
});

function selectAnnotationById(annotationId: string) {
  if (instance) {
    instance.setSelectedAnnotations(annotationId);
  }
}

interface HTMLInputEvent extends Event {
  target: HTMLInputElement & EventTarget;
}

let objectUrl = "";

// Load the initial document
load("example.pdf");