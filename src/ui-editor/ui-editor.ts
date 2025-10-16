/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-use-before-define */

import { LitElement, css, html, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { fireEvent, HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import { assert } from 'superstruct';
import { EnergyFlowCardExtConfig } from '../config';
import { cardConfigStruct } from './schema';
import { appearanceOptionsSchema, generalConfigSchema} from './schema/_schemas';
import localize from '../localize/localize';
import { gridSchema } from './schema/grid';
import { solarSchema } from './schema/solar';
import { batterySchema } from './schema/battery';
import { lowCarbonSchema } from './schema/low-carbon';
import { homeSchema } from './schema/home';
import { gasSchema } from './schema/gas';

const CONFIG_PAGES: {
  page: string;
  icon?: string;
  schema?: any[];
}[] = [
    {
      page: "appearance",
      icon: "mdi:cog",
      schema: appearanceOptionsSchema,
    },
    {
      page: "grid",
      icon: "mdi:transmission-tower",
      schema: gridSchema,
    },
    {
      page: "gas",
      icon: "mdi:fire",
      schema: gasSchema,
    },
    {
      page: "solar",
      icon: "mdi:solar-power",
      schema: solarSchema,
    },
    {
      page: "battery",
      icon: "mdi:battery-high",
      schema: batterySchema,
    },
    {
      page: "low_carbon",
      icon: "mdi:leaf",
      schema: lowCarbonSchema,
    },
    {
      page: "home",
      icon: "mdi:home",
      schema: homeSchema,
    },
    {
      page: "devices",
      icon: "mdi:dots-horizontal-circle-outline",
    }
  ];


export const loadHaForm = async () => {
  if (customElements.get('ha-form')) {
    return;
  }

  const helpers = await (window as any).loadCardHelpers?.();

  if (!helpers) {
    return;
  }

  const card = await helpers.createCardElement({ type: 'entity' });

  if (!card) {
    return;
  }

  await card.getConfigElement();
};

@customElement('energy-flow-card-ext-editor')
export class EnergyFlowCardExtEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: EnergyFlowCardExtConfig;
  @state() private _currentConfigPage: string | null = null;

  public async setConfig(config: EnergyFlowCardExtConfig): Promise<void> {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  connectedCallback(): void {
    super.connectedCallback();
    loadHaForm();
  }

  private _editDetailElement(pageClicked: string): void {
    this._currentConfigPage = pageClicked;
  }

  private _goBack(): void {
    this._currentConfigPage = null;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const config: EnergyFlowCardExtConfig = this._config;

    if (this._currentConfigPage) {
      const currentPage: string = this._currentConfigPage;
      const schema: any[] | undefined = CONFIG_PAGES.find((page) => page.page === currentPage)?.schema;
      const dataForForm: any = config[currentPage];

      return html`
        <subpage-header @go-back=${this._goBack} page=${currentPage}></subpage-header>
        <ha-form
          .hass=${this.hass}
          .data=${dataForForm}
          .schema=${schema}
          .computeLabel=${this._computeLabelCallback}
          @value-changed=${this._valueChanged}
        ></ha-form>
      `;
    }

    return html`
      <div class="card-config">
        <ha-form
          .hass=${this.hass}
          .data=${config}
          .schema=${generalConfigSchema()}
          .computeLabel=${this._computeLabelCallback}
          @value-changed=${this._valueChanged}
        ></ha-form>
        ${this.renderLinkSubPages()}
      </div>
    `;
  }

  private renderLinkSubPages = (): TemplateResult[] => {
    return CONFIG_PAGES.map((page) => this.renderLinkSubpage(page.page, page.icon));
  };

  private renderLinkSubpage = (page: string, icon: string | undefined = "mdi:dots-horizontal-circle-outline"): TemplateResult => {
    if (!page) {
      return html``;
    }

    return html`
        <link-subpage
          path=${page}
          header="${localize(`editor.${page}`)}"
          @open-sub-element-editor=${() => this._editDetailElement(page)}
          icon=${icon}
        >
        </link-subpage>
      `;
  };

  private _valueChanged(ev: any): void {
    const config = ev.detail.value || '';

    if (!this._config || !this.hass) {
      return;
    }

    fireEvent(this, 'config-changed', { config });
  }

  private _computeLabelCallback = (schema: any): string => this.hass!.localize(`ui.panel.lovelace.editor.card.generic.${schema?.name}`) || localize(`editor.${schema?.name}`);

  static get styles() {
    return css`
      ha-form {
        width: 100%;
      }

      ha-icon-button {
        align-self: center;
      }

      .entities-section * {
        background-color: #f00;
      }

      .card-config {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        margin-bottom: 10px;
      }

      .config-header {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }

      .config-header.sub-header {
        margin-top: 24px;
      }

      ha-icon {
        padding-bottom: 2px;
        position: relative;
        top: -4px;
        right: 1px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'energy-flow-card-ext-editor': EnergyFlowCardExtEditor;
  }
}
