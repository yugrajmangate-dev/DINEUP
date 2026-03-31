export default class MarkerPopup {
  constructor(container) {
    this.container = container;
    this.onSave = null;
    this.onDelete = null;
    this.onClose = null;
    this.currentData = null;

    this.overlay = document.createElement("div");
    this.overlay.className = "marker-popup-overlay";
    this.overlay.addEventListener("click", (event) => {
      if (event.target === this.overlay) this.close();
    });

    this.popup = document.createElement("div");
    this.popup.className = "marker-popup";
    this.popup.innerHTML = `
      <div class="marker-popup-header">
        <span class="marker-popup-title">Marker Details</span>
        <button class="marker-popup-close" title="Close">&times;</button>
      </div>
      <div class="marker-popup-coords">
        <span class="marker-popup-coords-label">Local Coordinates</span>
        <div class="marker-popup-coords-values">
          <span class="coord-axis">X: <span class="coord-val" data-field="coord-x">0.00</span></span>
          <span class="coord-axis">Y: <span class="coord-val" data-field="coord-y">0.00</span></span>
          <span class="coord-axis">Z: <span class="coord-val" data-field="coord-z">0.00</span></span>
        </div>
      </div>
      <div class="marker-popup-body">
        <div class="marker-popup-field">
          <label for="mp-label">Label</label>
          <input type="text" id="mp-label" data-field="label" placeholder="Private dining, bar, lounge" />
        </div>
        <div class="marker-popup-field">
          <label for="mp-link">Link URL</label>
          <input type="url" id="mp-link" data-field="link" placeholder="https://example.com" />
        </div>
        <div class="marker-popup-field">
          <label for="mp-image">Image URL</label>
          <input type="url" id="mp-image" data-field="image" placeholder="https://example.com/image.jpg" />
        </div>
        <div class="marker-popup-field">
          <label for="mp-notes">Notes</label>
          <textarea id="mp-notes" data-field="notes" rows="3" placeholder="What should guests know here?"></textarea>
        </div>
      </div>
      <div class="marker-popup-footer">
        <button class="marker-popup-btn marker-popup-btn-delete" data-action="delete">Delete</button>
        <div class="marker-popup-footer-right">
          <button class="marker-popup-btn marker-popup-btn-cancel" data-action="cancel">Cancel</button>
          <button class="marker-popup-btn marker-popup-btn-save" data-action="save">Save</button>
        </div>
      </div>
    `;

    this.overlay.appendChild(this.popup);
    this.container.appendChild(this.overlay);

    this.popup.querySelector(".marker-popup-close").addEventListener("click", () => this.close());
    this.popup.querySelector('[data-action="cancel"]').addEventListener("click", () => this.close());
    this.popup.querySelector('[data-action="save"]').addEventListener("click", () => this.save());
    this.popup.querySelector('[data-action="delete"]').addEventListener("click", () => this.remove());
  }

  open(data) {
    this.currentData = data;
    this.popup.querySelector('[data-field="coord-x"]').textContent = data.localPosition.x.toFixed(2);
    this.popup.querySelector('[data-field="coord-y"]').textContent = data.localPosition.y.toFixed(2);
    this.popup.querySelector('[data-field="coord-z"]').textContent = data.localPosition.z.toFixed(2);
    this.popup.querySelector('[data-field="label"]').value = data.label || "";
    this.popup.querySelector('[data-field="link"]').value = data.linkUrl || "";
    this.popup.querySelector('[data-field="image"]').value = data.imageUrl || "";
    this.popup.querySelector('[data-field="notes"]').value = data.notes || "";
    this.popup.querySelector('[data-action="delete"]').style.display = data.isNew ? "none" : "inline-flex";
    this.overlay.style.display = "flex";
    window.setTimeout(() => this.popup.querySelector('[data-field="label"]').focus(), 50);
  }

  close() {
    this.overlay.style.display = "none";
    this.currentData = null;
    this.onClose?.();
  }

  save() {
    if (!this.currentData) return;
    this.onSave?.({
      ...this.currentData,
      label: this.popup.querySelector('[data-field="label"]').value.trim(),
      linkUrl: this.popup.querySelector('[data-field="link"]').value.trim(),
      imageUrl: this.popup.querySelector('[data-field="image"]').value.trim(),
      notes: this.popup.querySelector('[data-field="notes"]').value.trim(),
    });
    this.close();
  }

  remove() {
    if (!this.currentData) return;
    this.onDelete?.(this.currentData.markerId, this.currentData.sphereId);
    this.close();
  }

  dispose() {
    this.overlay.remove();
  }
}
