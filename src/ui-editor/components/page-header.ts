import { mdiArrowLeft } from "@mdi/js";
import { fireEvent } from "custom-card-helpers";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit-element";
import { CARD_NAME } from "@/const";
import localize from "@/localize/localize";

const PAGE_HEADER_ELEMENT_NAME = CARD_NAME + "-page-header";

@customElement(PAGE_HEADER_ELEMENT_NAME)
export class PageHeader extends LitElement {
  @property() label?: string;
  @property() icon?: string;

  protected render(): TemplateResult {
    return html`
      <div class="header">
        <div class="back-title">
          <ha-icon-button .label=${localize("editor.go_back")} .path=${mdiArrowLeft} @click=${this._goBack}></ha-icon-button>
          <ha-icon icon=${this.icon} class="icon"></ha-icon>
          <span>${this.label}</span>
        </div>
      </div>
    `;
  }

  private _goBack(): void {
    fireEvent(this, "go-back");
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .back-title {
          display: flex;
          align-items: center;
          font-size: 1.2rem;
        }

        .icon {
          padding-right: 0.5rem;
        }
    `
    ];
  }
}

declare global {
  interface HASSDomEvents {
    "go-back": undefined;
  }
}
