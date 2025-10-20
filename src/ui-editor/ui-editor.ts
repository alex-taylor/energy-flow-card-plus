import { LitElement, css, html, nothing, TemplateResult, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { fireEvent, HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import { assert } from 'superstruct';
import { DeviceConfig, EditorPages, EnergyFlowCardExtConfig } from '@/config';
import { appearanceSchema, generalConfigSchema } from './schema';
import localize from '@/localize/localize';
import { gridSchema } from './schema/grid';
import { solarSchema } from './schema/solar';
import { batterySchema } from './schema/battery';
import { lowCarbonSchema } from './schema/low-carbon';
import { homeSchema } from './schema/home';
import { gasSchema } from './schema/gas';
import "./components/page-header";
import "./components/devices-editor";
import { CARD_NAME } from '@/const';
import { cardConfigStruct } from '@/config/validation';
import { computeHelperCallback, computeLabelCallback } from '.';
import { mdiChevronRight } from '@mdi/js';
import { getDefaultLowCarbonConfig, pruneConfig } from '../config/config';

export const EDITOR_ELEMENT_NAME = CARD_NAME + "-editor";

const CONFIG_PAGES: {
  page: EditorPages;
  icon: string;
  schema?;
  createConfig?;
}[] = [
    {
      page: EditorPages.Appearance,
      icon: "mdi:cog",
      schema: appearanceSchema,
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
      schema: lowCarbonSchema,
      createConfig: getDefaultLowCarbonConfig
    },
    {
      page: EditorPages.Home,
      icon: "mdi:home",
      schema: homeSchema
    },
    {
      page: EditorPages.Devices,
      icon: "mdi:devices"
    }
  ];

@customElement(EDITOR_ELEMENT_NAME)
export class EnergyFlowCardExtEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: EnergyFlowCardExtConfig;
  @state() private _currentConfigPage: EditorPages | null = null;

  public async setConfig(config: EnergyFlowCardExtConfig): Promise<void> {
    assert(config, cardConfigStruct);
    this._config = config;
  }

  protected render(): TemplateResult | typeof nothing {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const config: EnergyFlowCardExtConfig = this._config;

    if (this._currentConfigPage) {
      const currentPage: string = this._currentConfigPage;
      const schema = CONFIG_PAGES.find(page => page.page === currentPage)?.schema;
      const icon: string | undefined = CONFIG_PAGES.find((page) => page.page === currentPage)?.icon;

      if (!config[currentPage]) {
        config[currentPage] = CONFIG_PAGES.find(page => page.page === currentPage)?.createConfig(this.hass);
      }

      const configForPage: DeviceConfig = config[currentPage];
      // TODO: sanitize the config, adding in missing mandatory values

      return html`
        <energy-flow-card-ext-page-header @go-back=${this._goBack} icon="${icon}" label=${localize(`editor.${currentPage}`)}></energy-flow-card-ext-page-header>
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
              .schema=${schema(config, configForPage)}
              .computeLabel=${computeLabelCallback}
              .computeHelper=${computeHelperCallback}
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
          .schema=${generalConfigSchema(config)}
          .computeLabel=${computeLabelCallback}
          .computeHelper=${computeHelperCallback}
          @value-changed=${this._valueChanged}
        ></ha-form>
        ${this._renderPageLinks()}
      </div>
    `;
  }

  private _openPage(page: EditorPages): void {
    this._currentConfigPage = page;
  }

  private _goBack(): void {
    this._currentConfigPage = null;
  }

  private _renderPageLinks = (): TemplateResult[] => {
    return CONFIG_PAGES.map(page => this._renderPageLink(page.page, page.icon));
  };

  private _renderPageLink = (page: EditorPages, icon: string): TemplateResult => {
    if (!page) {
      return html``;
    }

    return html`
      <ha-control-button class="page-link" @click=${() => this._openPage(page)}>
        <ha-icon class="page-icon" .icon=${icon}></ha-icon>
        <div class="page-label">
          ${localize(`editor.${page}`)}
        </div>
        <ha-svg-icon .path=${mdiChevronRight}></ha-svg-icon>
      </ha-control-button>
    `;
  };

  private _valueChanged(ev: any): void {
    if (!this._config || !this.hass) {
      return;
    }

    let config = ev.detail.value || "";
    pruneConfig(config);
    // TODO: should probably sanitize too

    if (this._currentConfigPage) {
      config = {
        ...this._config,
        [this._currentConfigPage]: config
      };
    }

    fireEvent(this, 'config-changed', { config });
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-form {
          width: 100%;
        }

        .card-config {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .page-link {
          width: 100%;
          min-height: 4rem;
          cursor: pointer;
        }

        .page-icon {
          margin-right: 1rem;
          --mdc-icon-size: 2rem;
        }

        .page-label {
          width: 100%;
          font-size: 1.2rem;
          text-align: left;
        }
      `
    ];
  }
}
