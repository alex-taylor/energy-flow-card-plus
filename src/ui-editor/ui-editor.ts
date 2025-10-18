import { LitElement, css, html, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { fireEvent, HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import { assert } from 'superstruct';
import { EnergyFlowCardExtConfig } from '@/config';
import { cardConfigStruct, EditorPages } from './schema';
import { appearanceSchema, generalConfigSchema } from './schema/schemas';
import localize from '@/localize/localize';
import { gridSchema } from './schema/grid';
import { solarSchema } from './schema/solar';
import { batterySchema } from './schema/battery';
import { lowCarbonSchema } from './schema/low-carbon';
import { homeSchema } from './schema/home';
import { gasSchema } from './schema/gas';
import "./components/subpage-header";
import "./components/link-subpage";
import "./components/devices-editor";
import { CARD_NAME } from '@/const';

export const EDITOR_ELEMENT_NAME = CARD_NAME + "-editor";

const CONFIG_PAGES: {
  page: string;
  icon: string;
  schema?;
}[] = [
    {
      page: EditorPages.Appearance,
      icon: "mdi:cog",
      schema: appearanceSchema
    },
    {
      page: EditorPages.Grid,
      icon: "mdi:transmission-tower",
      schema: gridSchema
    },
    {
      page: EditorPages.Gas,
      icon: "mdi:fire",
      schema: gasSchema
    },
    {
      page: EditorPages.Solar,
      icon: "mdi:solar-power",
      schema: solarSchema
    },
    {
      page: EditorPages.Battery,
      icon: "mdi:battery-high",
      schema: batterySchema
    },
    {
      page: EditorPages.Low_Carbon,
      icon: "mdi:leaf",
      schema: lowCarbonSchema
    },
    {
      page: EditorPages.Home,
      icon: "mdi:home",
      schema: homeSchema
    },
    {
      page: EditorPages.Devices,
      icon: "mdi:dots-horizontal-circle-outline"
    }
  ];

@customElement(EDITOR_ELEMENT_NAME)
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
      const schema = CONFIG_PAGES.find((page) => page.page === currentPage)?.schema;
      const icon = CONFIG_PAGES.find((page) => page.page === currentPage)?.icon;
      const configForPage: any = config[currentPage];

      return html`
        <energy-flow-card-ext-subpage-header @go-back=${this._goBack} icon="${icon}" label=${localize(`editor.${currentPage}`)}></energy-flow-card-ext-subpage-header>
        ${this._currentConfigPage === EditorPages.Devices
          ? html`
            <energy-flow-card-ext-devices-editor
              .hass=${this.hass}
              .config=${this._config}
              @config-changed=${this._valueChanged}
            ></energy-flow-card-ext-devices-editor>
          `
          : html`
            <ha-form
              .hass=${this.hass}
              .data=${configForPage}
              .schema=${schema(config)}
              .computeLabel=${this._computeLabelCallback}
              .computeHelper=${this._computeHelperCallback}
              @value-changed=${this._valueChanged}
            ></ha-form>
          `
        }
      `;
    }

    return html`
      <div class="card-config">
        <ha-form
          .hass=${this.hass}
          .data=${config}
          .schema=${generalConfigSchema()}
          .computeLabel=${this._computeLabelCallback}
          .computeHelper=${this._computeHelperCallback}
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
        <energy-flow-card-ext-link-subpage label="${localize(`editor.${page}`)}" @open-sub-element-editor=${() => this._editDetailElement(page)} icon=${icon}></energy-flow-card-ext-link-subpage>
      `;
  };

  private _valueChanged(ev: any): void {
    if (!this._config || !this.hass) {
      return;
    }

    let config = ev.detail.value || '';

    if (this._currentConfigPage) {
      config = {
        ...this._config,
        [this._currentConfigPage]: config
      };
    }

    fireEvent(this, 'config-changed', { config });
  }

  private _computeHelperCallback = (schema: any): string => localize(`editor.${schema?.name}#helptext`, "");

  private _computeLabelCallback = (schema: any): string => localize(`editor.${schema?.name}`);

  static get styles() {
    return css`
      ha-form {
        width: 100%;
      }

      ha-icon-button {
        align-self: center;
      }

      .card-config {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        margin-bottom: 10px;
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

const loadHaForm = async () => {
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

declare global {
  interface HTMLElementTagNameMap {
    EDITOR_ELEMENT_NAME: EnergyFlowCardExtEditor;
  }
}
