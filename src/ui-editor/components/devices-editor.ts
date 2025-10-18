import { ActionConfig, HomeAssistant, fireEvent } from "custom-card-helpers";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit-element";
import localize from "@/localize/localize";
import { CARD_NAME } from "../../const";
import { DeviceConfig, EnergyFlowCardExtConfig } from "../../config";
import "./device-row-editor";
import { deviceSchema } from "../schema/device";

export const DEVICES_EDITOR_ELEMENT_NAME = CARD_NAME + "-devices-editor";

export interface GUIModeChangedEvent {
  guiMode: boolean;
  guiModeAvailable: boolean;
};

export interface EditorTarget extends EventTarget {
  value?: string;
  index?: number;
  checked?: boolean;
  configValue?: string;
  type?: HTMLInputElement["type"];
  config: ActionConfig;
};

@customElement(DEVICES_EDITOR_ELEMENT_NAME)
export class DevicesEditor extends LitElement {
  public hass!: HomeAssistant;
  @property({ attribute: false }) public config!: EnergyFlowCardExtConfig;
  @state() private _deviceConfig?: DeviceConfig;
  @state() private _configDevices?: DeviceConfig[];

  protected render(): TemplateResult {
    if (!this.config || !this.hass) {
      return html`<div>no config</div>`;
    }

    this._configDevices = this.config.devices || [];

    //if (this._deviceConfig) {
    //  return html`
    //    <ha-form
    //      .hass=${this.hass}
    //      @value-changed=${this._valueChanged}
    //      .data=${this.config}
    //      .schema=${deviceSchema}
    //      .computeLabel=${this._computeLabelCallback}
    //    ></ha-form>
    //  `;
    //}

    return html`
      <energy-flow-card-ext-device-row-editor
        .hass=${this.hass}
        .config=${this.config}
        .devices=${this._configDevices}
        @open-sub-element-editor=${this._editDetailElement}
        @devices-changed=${this._devicesChanged}
        style="width: 100%;"
      ></energy-flow-card-ext-device-row-editor>
    `;
  }

  private _valueChanged(ev: any): void {
    if (!this.config || !this.hass) {
      return;
    }

    const config = ev.detail.value || "";
    fireEvent(this, "config-changed", { config });
  }

  private _devicesChanged(ev: CustomEvent): void {
    const config = {
      ...this.config,
      devices: ev.detail.entities
    };

    this._configDevices = config.devices;
    fireEvent(this, "config-changed", { config });
  }

  private _computeLabelCallback = (schema: any) => localize(`editor.${schema?.name}`);

  private _editDetailElement(ev: any): void {
    this._deviceConfig = ev.detail.subElementConfig;
  }

  static get styles(): CSSResultGroup {
    return css``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "individual-devices-editor": DevicesEditor;
  }
}
