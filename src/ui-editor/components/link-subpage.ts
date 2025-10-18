import { mdiChevronRight } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit-element";
import { fireEvent } from "custom-card-helpers";
import { CARD_NAME } from "@/const";

export const LINK_SUBPAGE_ELEMENT_NAME = CARD_NAME + "-link-subpage";

@customElement(LINK_SUBPAGE_ELEMENT_NAME)
export class LinkSubpage extends LitElement {
  @property({ type: String }) label?: string;
  @property({ type: String }) icon = "mdi:format-list-bulleted-type";

  protected render(): TemplateResult {
    return html`
      <div
        class="link-subpage"
        @click=${this._openSubElementPage}
        @keydown=${this._openSubElementPage}
        @focus=${this._focusChanged}
        @blur=${this._focusChanged}
        role="button"
      >
        <ha-icon icon=${this.icon} class="summary-icon"></ha-icon>
        <slot name="label">
          <div class="label">
            ${this.label}
          </div>
        </slot>
        <ha-svg-icon .path=${mdiChevronRight}></ha-svg-icon>
      </div>
    `;
  }

  private _focusChanged(ev) {
    this.shadowRoot!.querySelector(".top")!.classList.toggle("focused", ev.type === "focus");
  }

  private _openSubElementPage(): void {
    fireEvent(this, "open-sub-element-editor", { open: true });
  }

  static get styles(): CSSResultGroup {
    return css`
      .link-subpage {
        width: 100%;
        display: flex;
        gap: 1rem;
        padding: var(--expansion-panel-summary-padding, 0 8px);
        min-height: 48px;
        align-items: center;
        cursor: pointer;
        overflow: hidden;
        font-weight: 500;
        outline: none;
      }

      .summary-icon {
        transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
        direction: var(--direction);
        color: var(--secondary-text-color);
      }

      .label,
      ::slotted([slot="label"]) {
        flex: 1;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    LINK_SUBPAGE_ELEMENT_NAME: LinkSubpage;
  }

  // for fire event
  interface HASSDomEvents {
    "open-sub-element-editor": {
      open: boolean;
    };
  }
}
