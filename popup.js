// LinkVault Chrome Extension - Main JavaScript File

class LinkVault {
  constructor() {
    this.links = [];
    this.filteredLinks = [];
    this.currentEditId = null;
    this.init();
  }

  // Initialize the extension
  async init() {
    await this.loadLinks();
    this.setupEventListeners();
    this.filterLinks("", ""); // Initial display
    this.populatePlatformFilter();
  }

  // Load links from Chrome storage
  async loadLinks() {
    try {
      const result = await chrome.storage.local.get(["links"]);
      this.links = result.links || [];
    } catch (error) {
      console.error("Error loading links:", error);
      this.showNotification("Error loading links", "error");
    }
  }

  // Save links to Chrome storage
  async saveLinks() {
    try {
      await chrome.storage.local.set({ links: this.links });
    } catch (error) {
      console.error("Error saving links:", error);
      this.showNotification("Error saving links", "error");
    }
  }

  // Setup event listeners
  setupEventListeners() {
    // Add link form
    document.getElementById("linkForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.addOrUpdateLink();
    });

    // Get current URL button
    document.getElementById("getCurrentUrl").addEventListener("click", () => {
      this.getCurrentTabUrl();
    });

    // Search functionality
    document.getElementById("searchInput").addEventListener("input", (e) => {
      this.filterLinks(
        e.target.value,
        document.getElementById("platformFilter").value
      );
    });

    // Platform filter
    document
      .getElementById("platformFilter")
      .addEventListener("change", (e) => {
        this.filterLinks(
          document.getElementById("searchInput").value,
          e.target.value
        );
      });

    // Clear filters
    document.getElementById("clearFilters").addEventListener("click", () => {
      document.getElementById("searchInput").value = "";
      document.getElementById("platformFilter").value = "";
      this.filterLinks("", "");
    });

    // Export/Import
    document.getElementById("exportBtn").addEventListener("click", () => {
      this.exportData();
    });

    document.getElementById("importBtn").addEventListener("click", () => {
      document.getElementById("importFile").click();
    });

    document.getElementById("importFile").addEventListener("change", (e) => {
      this.importData(e.target.files[0]);
    });

    // Edit modal
    document.getElementById("editForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.updateLinkFromModal();
    });

    document.getElementById("cancelEdit").addEventListener("click", () => {
      this.closeEditModal();
    });

    document.querySelector(".close").addEventListener("click", () => {
      this.closeEditModal();
    });

    // Cancel edit button in main form
    document.getElementById("cancelEditBtn").addEventListener("click", () => {
      this.cancelEdit();
    });

    // Close modal when clicking outside
    document.getElementById("editModal").addEventListener("click", (e) => {
      if (e.target === document.getElementById("editModal")) {
        this.closeEditModal();
      }
    });
  }

  // Add or update a link
  async addOrUpdateLink() {
    const url = document.getElementById("linkUrl").value.trim();
    const platform = document.getElementById("platform").value.trim();
    const tags = document.getElementById("tags").value.trim();
    const description = document.getElementById("description").value.trim();

    if (!url || !platform) {
      this.showNotification("Please fill in URL and Platform fields", "error");
      return;
    }

    if (!this.isValidUrl(url)) {
      this.showNotification("Please enter a valid URL", "error");
      return;
    }

    const linkData = {
      url: url,
      platform: platform,
      tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
      description: description,
      dateModified: new Date().toISOString(),
    };

    if (this.currentEditId) {
      // Update existing link
      const index = this.links.findIndex((l) => l.id === this.currentEditId);
      if (index !== -1) {
        this.links[index] = { ...this.links[index], ...linkData };
        this.showNotification("Link updated successfully", "success");
      }
    } else {
      // Add new link
      const newLink = {
        id: Date.now().toString(),
        dateAdded: new Date().toISOString(),
        ...linkData,
      };
      this.links.unshift(newLink);
      this.showNotification("Link added successfully", "success");
    }

    this.resetForm();
    await this.saveLinks();
    this.filterLinks(
      document.getElementById("searchInput").value,
      document.getElementById("platformFilter").value
    );
    this.populatePlatformFilter();
  }

  // Edit link (populates main form)
  editLink(id) {
    const link = this.links.find((l) => l.id === id);
    if (!link) return;

    this.currentEditId = id;

    document.getElementById("linkUrl").value = link.url;
    document.getElementById("platform").value = link.platform;
    document.getElementById("tags").value = link.tags.join(", ");
    document.getElementById("description").value = link.description;

    document.getElementById("addLinkBtn").textContent = "Update Link";
    document.getElementById("cancelEditBtn").style.display = "inline-block";

    document
      .querySelector(".add-link-section")
      .scrollIntoView({ behavior: "smooth" });

    this.showNotification("Editing link - modify and click Update", "info");
  }

  // Cancel edit from main form
  cancelEdit() {
    this.resetForm();
    this.showNotification("Edit cancelled", "info");
  }

  // Update link (from modal)
  async updateLinkFromModal() {
    const url = document.getElementById("editUrl").value.trim();
    const platform = document.getElementById("editPlatform").value.trim();
    const tags = document.getElementById("editTags").value.trim();
    const description = document.getElementById("editDescription").value.trim();

    if (!url || !platform) {
      this.showNotification("Please fill in URL and Platform fields", "error");
      return;
    }

    if (!this.isValidUrl(url)) {
      this.showNotification("Please enter a valid URL", "error");
      return;
    }

    const index = this.links.findIndex((l) => l.id === this.currentEditId);
    if (index !== -1) {
      this.links[index] = {
        ...this.links[index],
        url,
        platform,
        tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
        description,
        dateModified: new Date().toISOString(),
      };

      await this.saveLinks();
      this.filterLinks(
        document.getElementById("searchInput").value,
        document.getElementById("platformFilter").value
      );
      this.populatePlatformFilter();
      this.closeEditModal();
      this.showNotification("Link updated successfully", "success");
    }
  }

  // Copy link to clipboard
  copyLink(url) {
    navigator.clipboard.writeText(url).then(
      () => {
        this.showNotification("Link copied to clipboard!", "success");
      },
      (err) => {
        console.error("Failed to copy link: ", err);
        this.showNotification("Failed to copy link", "error");
      }
    );
  }

  // Delete link
  async deleteLink(id) {
    if (confirm("Are you sure you want to delete this link?")) {
      this.links = this.links.filter((link) => link.id !== id);
      await this.saveLinks();
      this.filterLinks(
        document.getElementById("searchInput").value,
        document.getElementById("platformFilter").value
      );
      this.populatePlatformFilter();
      this.showNotification("Link deleted successfully", "success");
    }
  }

  // Filter links based on search and platform
  filterLinks(searchTerm, platform) {
    const term = searchTerm.toLowerCase();
    this.filteredLinks = this.links.filter((link) => {
      const matchesSearch =
        !term ||
        link.url.toLowerCase().includes(term) ||
        link.platform.toLowerCase().includes(term) ||
        link.description.toLowerCase().includes(term) ||
        link.tags.some((tag) => tag.toLowerCase().includes(term));

      const matchesPlatform = !platform || link.platform === platform;

      return matchesSearch && matchesPlatform;
    });

    this.updateDisplay();
  }

  // Get current tab URL
  async getCurrentTabUrl() {
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs[0] && tabs[0].url) {
        document.getElementById("linkUrl").value = tabs[0].url;
        const hostname = new URL(tabs[0].url).hostname;
        const platform = this.guessPlatform(hostname);
        if (platform) {
          document.getElementById("platform").value = platform;
        }
      }
    } catch (error) {
      console.error("Error getting current tab URL:", error);
      this.showNotification("Could not get current tab URL", "error");
    }
  }

  // Guess platform from hostname
  guessPlatform(hostname) {
    const platformMap = {
      "facebook.com": "Facebook",
      "github.com": "GitHub",
      "twitter.com": "Twitter",
      "x.com": "Twitter",
      "linkedin.com": "LinkedIn",
      "instagram.com": "Instagram",
      "youtube.com": "YouTube",
      "reddit.com": "Reddit",
      "medium.com": "Medium",
      "discord.com": "Discord",
      "stackoverflow.com": "Stack Overflow",
      "tiktok.com": "TikTok",
      "pinterest.com": "Pinterest",
      "behance.net": "Behance",
      "dribbble.com": "Dribbble",
    };

    for (const [domain, platform] of Object.entries(platformMap)) {
      if (hostname.includes(domain)) {
        return platform;
      }
    }
    return null;
  }

  // Update display
  updateDisplay() {
    const linksList = document.getElementById("linksList");
    const noLinksMessage = document.getElementById("noLinksMessage");
    const linkCount = document.getElementById("linkCount");

    linkCount.textContent = `${this.filteredLinks.length} link${
      this.filteredLinks.length !== 1 ? "s" : ""
    }`;

    if (this.filteredLinks.length === 0) {
      linksList.innerHTML = "";
      linksList.style.display = "none";
      noLinksMessage.style.display = "block";
    } else {
      linksList.style.display = "block";
      noLinksMessage.style.display = "none";
      linksList.innerHTML = this.filteredLinks
        .map((link) => this.createLinkHTML(link))
        .join("");

      this.filteredLinks.forEach((link) => {
        const editBtn = document.getElementById(`edit-${link.id}`);
        const deleteBtn = document.getElementById(`delete-${link.id}`);
        const copyBtn = document.getElementById(`copy-${link.id}`);

        if (copyBtn) {
          copyBtn.addEventListener("click", () => this.copyLink(link.url));
        }
        if (editBtn) {
          editBtn.addEventListener("click", () => this.editLink(link.id));
        }
        if (deleteBtn) {
          deleteBtn.addEventListener("click", () => this.deleteLink(link.id));
        }
      });
    }
  }

  // Create HTML for a single link
  createLinkHTML(link) {
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return (
        date.toLocaleDateString() +
        " " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    };

    const tagsHTML =
      link.tags.length > 0
        ? `<div class="link-tags">${link.tags
            .map((tag) => `<span class="tag">${this.escapeHtml(tag)}</span>`)
            .join("")}</div>`
        : "";

    const descriptionHTML = link.description
      ? `<div class="link-description">${this.escapeHtml(
          link.description
        )}</div>`
      : "";

    return `
            <div class="link-item">
                <div class="link-header">
                    <div class="link-info">
                        <a href="${
                          link.url
                        }" target="_blank" class="link-url" title="${this.escapeHtml(
      link.url
    )}">
                            ${this.truncateUrl(link.url, 50)}
                        </a>
                        <div class="link-platform">📍 ${this.escapeHtml(
                          link.platform
                        )}</div>
                        ${descriptionHTML}
                    </div>
                    <div class="link-actions">
                        <button id="copy-${
                          link.id
                        }" class="copy-btn" title="Copy Link">📋</button>
                        <button id="edit-${
                          link.id
                        }" class="edit-btn" title="Edit link">✏️</button>
                        <button id="delete-${
                          link.id
                        }" class="delete-btn" title="Delete link">🗑️</button>
                    </div>
                </div>
                ${tagsHTML}
                <div class="link-meta">
                    <span>Added: ${formatDate(link.dateAdded)}</span>
                    ${
                      link.dateModified !== link.dateAdded
                        ? `<span>Modified: ${formatDate(
                            link.dateModified
                          )}</span>`
                        : ""
                    }
                </div>
            </div>
        `;
  }

  // Populate platform filter dropdown
  populatePlatformFilter() {
    const platformFilter = document.getElementById("platformFilter");
    const currentPlatform = platformFilter.value;
    const platforms = [
      ...new Set(this.links.map((link) => link.platform)),
    ].sort();

    platformFilter.innerHTML = '<option value="">All Platforms</option>';
    platforms.forEach((platform) => {
      platformFilter.innerHTML += `<option value="${this.escapeHtml(
        platform
      )}">${this.escapeHtml(platform)}</option>`;
    });
    platformFilter.value = currentPlatform;
  }

  // Export data
  exportData() {
    const data = {
      links: this.links,
      exportDate: new Date().toISOString(),
      version: "1.0.0",
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `linkvault-backup-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showNotification("Data exported successfully", "success");
  }

  // Import data
  async importData(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.links || !Array.isArray(data.links)) {
        throw new Error("Invalid file format");
      }

      const validLinks = data.links.filter(
        (link) => link.url && link.platform && link.id && link.dateAdded
      );

      if (validLinks.length === 0) {
        throw new Error("No valid links found in file");
      }

      const merge = confirm(
        `Found ${validLinks.length} links. Merge with existing (OK) or replace all (Cancel)?`
      );

      if (merge) {
        validLinks.forEach((importedLink) => {
          const existingIndex = this.links.findIndex(
            (link) => link.id === importedLink.id
          );
          if (existingIndex !== -1) {
            this.links[existingIndex] = importedLink;
          } else {
            this.links.push(importedLink);
          }
        });
      } else {
        this.links = validLinks;
      }

      await this.saveLinks();
      this.filterLinks("", "");
      this.populatePlatformFilter();
      this.showNotification(
        `Successfully imported ${validLinks.length} links`,
        "success"
      );
    } catch (error) {
      console.error("Error importing data:", error);
      this.showNotification("Error importing data: " + error.message, "error");
    }

    document.getElementById("importFile").value = "";
  }

  // Open edit modal
  openEditModal(link) {
    this.currentEditId = link.id;
    document.getElementById("editUrl").value = link.url;
    document.getElementById("editPlatform").value = link.platform;
    document.getElementById("editTags").value = link.tags.join(", ");
    document.getElementById("editDescription").value = link.description;
    document.getElementById("editModal").style.display = "block";
  }

  // Close edit modal
  closeEditModal() {
    document.getElementById("editModal").style.display = "none";
    this.currentEditId = null;
  }

  // Reset form
  resetForm() {
    document.getElementById("linkForm").reset();
    document.getElementById("addLinkBtn").textContent = "Add Link";
    document.getElementById("cancelEditBtn").style.display = "none";
    this.currentEditId = null;
  }

  // Utility functions
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  truncateUrl(url, length) {
    if (url.length <= length) return url;
    return url.substring(0, length - 3) + "...";
  }

  escapeHtml(text) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  // Show notification
  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    // Basic styling, assuming you have CSS for these classes
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Initialize the extension when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new LinkVault();
});