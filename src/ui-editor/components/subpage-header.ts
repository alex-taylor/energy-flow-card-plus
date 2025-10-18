import { mdiArrowLeft } from "@mdi/js";
import { fireEvent } from "custom-card-helpers";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit-element";
import { CARD_NAME } from "../../const";

export const SUBPAGE_HEADER_ELEMENT_NAME = CARD_NAME + "-subpage-header";

@customElement(SUBPAGE_HEADER_ELEMENT_NAME)
export class SubpageHeader extends LitElement {
  @property() label?: string;
  @property() icon?: string;

  protected render(): TemplateResult {
    return html`
      <div class="header">
        <div class="back-title">
          <ha-icon-button .label=${"Go Back"} .path=${mdiArrowLeft} @click=${this._goBack}></ha-icon-button>
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
    return css`
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }

      .back-title {
        display: flex;
        align-items: center;
        font-size: 18px;
      }

      .icon {
        padding-right: 10px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    SUBPAGE_HEADER_ELEMENT_NAME: SubpageHeader;
  }

  interface HASSDomEvents {
    "go-back": undefined;
  }
}
