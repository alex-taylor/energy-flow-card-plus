# Energy Flow Card Plus

![GitHub release (latest by date)](https://github.com/alex-taylor/energy-flow-card-plus/releases/tag/v0.1.1-alpha)
![GitHub all releases](https://github.com/alex-taylor/energy-flow-card-plus/releases)

<details> <summary>✅ Advantages of this Card compared to the official Energy Distribution Card</summary>

## Bugfixes
  - Corrected crooked lines
  ![Crooked Lines](https://github.com/flixlix/energy-flow-card-plus/assets/61006057/5250a695-a022-4960-a06a-80650a7fc139)
  - Corrected curved lines not connecting to the circle
  ![Curved Lines](https://github.com/flixlix/energy-flow-card-plus/assets/61006057/1dda7efb-be4d-4304-a5d8-6faea257a8fe)
  - Changed the color of the line between the battery and the grid
  ![Color Line Battery Grid](https://github.com/flixlix/energy-flow-card-plus/assets/61006057/62d71eae-049d-4492-86cf-16f712920cb6)
## Features
- Choose wether or not to change the color of the icons
- Choose wether or not to change the color of the text
- Added option for Dynamic Circle colors
- Use different sensors than the ones used in the Energy Integration
- Choose wether to show the Energy or the Percentage in the Low-Carbon Circle
- Added Option for Secondary Information
- Option for Templates in secondary Information
- Override Home State (eg: to calculate Energy losses)
- Choose wether to hide inactive lines
- Individual Devices


</details>

## Goal

Although the code base is very different, the design of this card is heavily inspired by the [Official Energy Distribution Card](https://www.home-assistant.io/dashboards/energy/#energy-distribution).

The goal is to deliver a card that fits in the overall design of the Energy Dashboard, while providing more features, such as Individual Devices, Secondary Information and bringing small UI enhancements.

## Scope

This card **does not** aim to display Values (Meaning instantaneous/current consumption).
If this is your goal, check out the [Power Flow Card Plus](https://github.com/flixlix/power-flow-card-plus).

## Recommendation

![](https://user-images.githubusercontent.com/61006057/238181763-b5064161-b8dd-4fa5-865a-5815635d3cbb.png)
If you would like to customize the Energy period selector and its dates, check out this card: [Energy Period Selector Plus](https://github.com/flixlix/energy-period-selector-plus)

## Install

### HACS (recommended)

This card is direclty available in [HACS](https://hacs.xyz/) (Home Assistant Community Store).
_HACS is a third party community store and is not included in Home Assistant out of the box._
To install this:

- Go to HACS
- Click on `Frontend`
- Search for `Energy Flow Card Plus`
- Install via UI

<details>  <summary>Manual Install</summary>

1. Download and copy `energy-flow-card-plus.js` from the [latest release](https://github.com/flixlix/energy-flow-card-plus/releases/latest) into your `config/www` directory.

2. Add the resource reference as decribed below.

### Add resource reference

If you configure Dashboards via YAML, add a reference to `energy-flow-card-plus.js` inside your `configuration.yaml`:

```yaml
resources:
  - url: /local/energy-flow-card-plus.js
    type: module
```

Else, if you prefer the graphical editor, use the menu to add the resource:

1. Make sure, advanced mode is enabled in your user profile (click on your user name to get there)
2. Navigate to Settings -> Dashboards
3. Click three dot icon
4. Select Resources
5. Hit (+ ADD RESOURCE) icon
6. Enter URL `/local/energy-flow-card-plus.js` and select type "JavaScript Module".
   (Use `/hacsfiles/energy-flow-card-plus/energy-flow-card-plus.js` and select "JavaScript Module" for HACS install if HACS didn't do it already)
 
</details>
   
## Using the card

> ⚠️ This card also has a UI-Editor. This Editor is currently incompatible with Card Mod. I created a PR to fix this issue, but it hasn't been merged yet. Here is the [PR #277](https://github.com/thomasloven/lovelace-card-mod/pull/277). Since it hasn't been merged yet, I also released a fork with the changes from the PR. Installing this Version of Card Mod you can use this card in conjunction with Card Mod. [Here is my fork](https://github.com/flixlix/lovelace-card-mod)

> ⚠️ This card offers a **LOT** of configuration options. Don't worry, if you want your card's appearance to match the oficial Energy Flow Card, you will only need to setup the entities. The rest of the options only enable further customization. If this is your goal, please go to [Minimal Configuration](#minimal-configuration)


### Options

#### Card options

| Name                | Type      |   Default    | Description                                                                                                                                                                  |
|---------------------| --------- |:------------:|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| type                | `string`  | **required** | `custom:energy-flow-card-plus`.                                                                                                                                               |
| entities            | `object`  | **required** | One or more sensor entities, see [entities object](#entities-object) for additional entity options.                                                                          |
| title               | `string`  |              | Shows a title at the top of the card.                                                                                                                                        |
| energy_date_selection | `boolean` | true | If set to `true`, will follow the energy date picker (that is in the same dashboard) and get entities information from the statistics. |
| dashboard_link      | `string`  |              | Shows a link to an Energy Dashboard. Should be a url path to location of your choice. If you wanted to link to the built-in dashboard you would enter `/energy` for example. |
| inverted_entities   | `string`  |              | Comma seperated list of entities that should be inverted (negative for consumption and positive for production). Example: `inverted_entities: battery, grid`           |
| wh_decimals          | `number`  |      1       | Number of decimals rounded to when watthours are displayed.                                                                                                                      |
| kwh_decimals         | `number`  |      1       | Number of decimals rounded to when kilowatthours are displayed.                                                                                                                  |
| mwh_decimals          | `number`  |      1       | Number of decimals rounded to when megawatthours are displayed.                                                                                                                      |
| min_flow_rate       | `number`  |     .75      | Represents how much time it takes for the quickest dot to travel from one end to the other in seconds. |
| max_flow_rate       | `number`  |      6       | Represents how much time it takes for the slowest dot to travel from one end to the other in seconds. |
| wh_kwh_threshold      | `number`  |      1000       | The number of watthours to display before converting to and displaying kilowatthours. Setting of 0 will always display in kilowatthours. |
| kwh_mwh_threshold      | `number`  |      1000       | The number of kilowatthours to display before converting to and displaying megawatthours. Setting of 0 will always display in megawatthours. |
| clickable_entities  | `boolean` |    false     | If true, clicking on the entity will open the entity's more info dialog. |
| min_expected_energy | `number`  |    0.01 | Represents the minimum amount of energy (in Watthours) expected to flow through the system at a given moment. Only used in the [New Flow Formula](#new-flow-formula). |
| max_expected_energy | `number`  | 2000 | Represents the maximum amount of energy (in Watthours) expected to flow through the system at a given moment. Only used in the [New Flow Formula](#new-flow-formula). |
| display_zero_lines | `boolean` | true | If false, lines where no energy is flowing will be hidden. |
| use_new_flow_rate_model | `boolean` | false | If set to true, the card will use the [New Flow Formula](#new-flow-formula).

#### Entities object

At least one of _grid_, _battery_, or _solar_ is required. All entites (except _battery_charge_) should have a `unit_of_measurement` attribute of Wh(Watthours) or kW(kilowatthours).

| Name           | Type                | Description                                                                                                                                                                                                     |
| -------------- | :------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| grid           | `object` | Check [Grid Configuration](#grid-configuration) for more information. |
| solar          | `object` | Check [Solar Configuration](#solar-configuration) for more information. |
| battery        | `object` | Check [Battery Configuration](#battery-configuration) for more information. |
| individual1    | `object` | Check [Individual Devices](#individual-configuration) for more information. |
| individual2    | `object` | Check [Individual Devices](#individual-configuration) for more information. |
| home           | `object` | Check [Home Configuration](#home-configuration) for more information. |
| fossil_fuel_percentage | `object` | Check [Fossil Fuel Percentage](#fossil-fuel-configuration) for more information. |

#### Grid Configuration

| Name        | Type    | Default  | Description                                                                                       |
| ----------- | ------- | -------- | ------------------------------------------------------------------------------------------------- |
| entity | `object` | `undefined` required | Object containing `production` and/or `consumption` properties with one or a list of Entity IDs of a sensor supporting a state with positive values. Check [split entites](#split-entities) for more info. |
| name  | `string` | `Grid` | If you don't populate this option, the label will continue to update based on the language selected. |
| icon | `string` | `mdi:transmission-tower` | Icon path for the icon inside the Grid Circle. |
| color | `object` |  | Check [Color Objects](#color-object) for more information. |
| color_icon | `boolean` or "production" or "consumption" | `false` | If set to `true`, icon color will match the highest value. If set to `production`, icon color will match the production. If set to `consumption`, icon color will match the consumption. |
| color_circle | `boolean` or "production" or "consumption" | `false` | If set to `production`, circle color will match the production. If set to `consumption`, circle color will match the consumption. If set to `false`, circle color will match the consumption. |
| secondary_info | `object` | `undefined` | Check [Secondary Info Object](#secondary-info-configuration) |

#### Solar Configuration

| Name        | Type    | Default  | Description                                                                                       |
| ----------- | ------- | -------- | ------------------------------------------------------------------------------------------------- |
| entity | `string` | `undefined` required | One or a list of Entity IDs providing a state with the value of solar production. |
| name  | `string` | `Solar` | Label for the solar option. If you don't populate this option, the label will continue to update based on the language selected. |
| icon | `string` | `mdi:solar-power` | Icon path for the icon inside the Solar Circle. |
| color | `string` |  | HEX value of the color for circles labels and lines of solar production. |
| color_icon | `boolean` | `false` | If set to `true`, icon color will match the circle's color. If set to `false`, icon color will match the text's color.  |
| color_value | `boolean` | `false` | If set to `true`, text color of the state will match the circle's color. If set to `false`, text color of the state will be your primary text color.  |
| display_zero_state | `boolean` | `true` | If set to `true`, the state will be shown even if it is `0`. If set to `false`, the state will be hidden if it is `0`. |
| secondary_info | `object` | `undefined` | Check [Secondary Info Object](#secondary-info-configuration) |

#### Battery Configuration

| Name        | Type    | Default  | Description                                                                                       |
| ----------- | ------- | -------- | ------------------------------------------------------------------------------------------------- |
| entity | `object` | `undefined` required | Object containing `production` and/or `consumption` properties with one or a list of Entity IDs of a sensor supporting a state with positive values. Check [split entites](#split-entities) for more info. |
| state_of_charge | `string` | `undefined` required | Entity ID providing a state with the state of charge of the battery in percent (state of  `100` for a full battery). |
| state_of_charge_unit | `string` | `%` | Unit of the state of charge. |
| state_of_charge_unit_white_space | `boolean` | `true` | If set to `false`, the unit of the state of charge will not have a white space in front of it. |
| state_of_charge_decimals | `number` | `0` | Number of decimals to show for the state of charge. |
| name  | `string` | `Battery` | Label for the battery option. If you don't populate this option, the label will continue to update based on the language selected. |
| icon | `string` | `mdi:battery` or dynamic based on state of the battery | Icon path for the icon inside the Battery Circle. |
| color | `object` |  | Check [Color Objects](#color-object) for more information. |
| color_icon | `boolean` or "production" or "consumption" | `false` | If set to `true`, icon color will match the highest value. If set to `production`, icon color will match the production. If set to `consumption`, icon color will match the consumption. |
| state_of_charge_unit_white_space | `boolean` | `true` | If set to `false`, there will be no white space between the state of charge and the unit of the state of charge. |
| color_state_of_charge_value | `boolean` or "production" or "consumption" | If set to `true`, state of charge text color will match the highest value. If set to `production`, state of charge text color will match the production. If set to `consumption`, state of charge text color will match the consumption. |
| color_circle | `boolean` or "production" or "consumption" | If set to `production`, circle color will match the production. If set to `consumption`, circle text color will match the consumption. |

#### Individual Configuration

| Name        | Type    | Default  | Description                                                                                       |
| ----------- | ------- | -------- | ------------------------------------------------------------------------------------------------- |
| entity | `string` | `undefined` required | One or a list of Entity IDs providing a state with the value of an individual consumption. |
| name  | `string` | `Car` or `Motorcycle` | Label for the individual device option. If you don't populate this option, the label will continue to update based on the language selected. |
| icon | `string` | `mdi:car-electric` or `mdi:motorbike-electric` | Icon path for the icon inside the Individual Device Circle. |
| color | `string` | `#d0cc5b` or `#964cb5` | HEX value of the color for circles labels and lines of the individual device. |
| color_icon | `boolean` | `false` | If set to `true`, icon color will match the circle's color. If set to `false`, icon color will match the text's color.  |
| unit_of_measurement | `string` | `Wh`or `kWh` (dynamic) | Sets the unit of measurement to show in the corresponding circle |
| inverted_animation |`boolean` | `false` | If set to true, the small dots will flow in the opposite direction. |
| display_zero | `boolean` | `false` | If set to `true`, the device will be displayed even if the entity state is `0` or not a number (eg: `unavailable`). Otherwise, the non-fossil section will be hidden. |
| display_zero_tolerance | `number` | `0` | If set, the device will be displayed if the state is greater than the tolerance set (This is also available for the secondary info). No need to set `display_zero` property to true. |
| display_zero_state | `boolean` | `true` | If set to `true`, the state will be shown even if it is `0`. If set to `false`, the state will be hidden if it is `0`. |
| color_value | `boolean` | `false` | If set to `true`, state text color will match the circle's color. If set to `false`, state text color will be the primary text color.  |
| secondary_info | `object` | `undefined` | Check [Secondary Info Object](#secondary-info-configuration) |

#### Home Configuration

| Name        | Type    | Default  | Description                                                                                       |
| ----------- | ------- | -------- | ------------------------------------------------------------------------------------------------- |
| entity | `string` | `undefined` required | One or a list of Entity IDs providing a state with the value of your home's consumption. Note that this entity will not be displayed and will only be used for the more info dialog when clicking the home section. |
| name  | `string` | `Home` | Label for the home option. If you don't populate this option, the label will continue to update based on the language selected. |
| icon | `string` | `mdi:home` | Icon path for the icon inside the Home Circle. |
| color_icon | `boolean` or "solar" or "grid" or "battery" | `false` | If set to `true`, icon color will match the highest value. If set to `solar`, icon color will match the color of solar. If set to `grid`, icon color will match the color of the grid consumption. If set to `battery`, icon color will match the color of the battery consumption. |
| color_value | `boolean` or "solar" or "grid" or "battery" | `false` | If set to `true`, state text color will match the highest value. If set to `solar`, state text color will match the color of solar. If set to `grid`, state text color will match the color of the grid consumption. If set to `battery`, state text color will match the color of the battery consumption. |
| secondary_info | `object` | `undefined` | Check [Secondary Info Object](#secondary-info-configuration) |
| subtract_individual | `boolean` | false | If set to `true`, the home consumption will be calculated by subtracting the sum of the individual devices from the home consumption. |
| override_state | `boolean` | `false` | If set to `true`, the home consumption will be the state of the entity provided. By default the home consumption is caluclated by adding up all sources. This is useful, when for example you are using an inverter and it has energy losses. |

#### Fossil Fuel Configuration

| Name        | Type    | Default  | Description                                                                                       |
| ----------- | ------- | -------- | ------------------------------------------------------------------------------------------------- |
| show | `boolean` | `false` | If set to `true`, the fossil fuel section will be displayed. This information is probvided by the HA Energy Integration, so make sure you have it and CO2-Signal set up correctly. |
| entity           | `string` | `none` | Entity ID for opening the more info dialog. |
| name        | `string` | Low-carbon | Name to appear as a label on top of the circle. |
| icon | `string`            | `mdi:leaf` | Icon path (eg: `mdi:home`) to display inside the circle of the device. |
| color          | `string`        | `#0f9d58` |  HEX Value of a color to display as the stroke of the circle and line connecting to the grid. |
| color_icon | `boolean` | `false` | If `true`, the icon will be colored with the color property. Otherwise it will be the same color as all other icons. |
| display_zero | `boolean` | `true` | If set to `true`, the device will be displayed even if the entity state is `0` or not a number (eg: `unavailable`). Otherwise, the non-fossil section will be hidden. |
| display_zero_state | `boolean` | `true` | If set to `true`, the state will be shown even if it is `0`. If set to `false`, the state will be hidden if it is `0`. |
| state_type | `string` | `energy` | The type of state to use for the entity. Can be `energy` or `percentage`. When set to `energy` the state will be the amount of energy from the grid that is low-carbon. When set to `percentage` the state will be the percentage of energy from the grid that is low-carbon. |
| unit_white_space | `boolean` | `true` | If set to `false` will not add any whitespace between unit and state. Otherwise, white space will be added. |
| calculate_flow_rate | `boolean` or `number` | `false` | If set to `true`, the flow rate will be calculated by using the flow rate formula (either the new or the old one, depending on your configuration). If set to a number, the flow rate will be set to that number. For example, defining the value `10` will ensure one dot will flow every 10 seconds. |
| secondary_info | `object` | `undefined` | Check [Secondary Info Object](#secondary-info-configuration) |

#### Color Object

| Name        | Type    | Description                                                                                       |
| ----------- | ------- | ------------------------------------------------------------------------------------------------- |
| production | `string` | HEX value of the color for circles labels and lines of production. |
| consumption | `string` | HEX value of the color for circles labels and lines of consumption. |

#### Split entities

Can be use with either Grid or Battery configuration. The same `unit_of_measurement` rule as above applies.

| Name        | Type     | Description                                                                                       |
| ----------- | -------- | ------------------------------------------------------------------------------------------------- |
| consumption | `string` | Entity ID providing a state value for consumption, this is required if using a split grid object. |
| production  | `string` | Entity ID providing a state value for production                                                  |

#### Secondary Info Configuration

This Feature allows you to configure an additional small text for each Individual Device. Here you can put , for example, the state of charge of an electric car.

| Name        | Type     | Description                                                                                       |
| ----------- | -------- | ------------------------------------------------------------------------------------------------- |
| entity| `string` required | Entity ID providing a state value that is going to be displayed. |
| unit_of_measurement | `string` | A string to be used as the unit of measurement. (Important: don't forget surrounding string with quotes) |
| icon | `string` | An icon path to be displayed next to the state of the individual device. This is optional, meaning if you don't use this, no icon will be displayed. |
| unit_white_space | `boolean` |  Default is `true`. If set to `false` will not add any whitespace between unit and state. Otherwise, white space will be added. |
| display_zero | `boolean` | Default is `false`. If set to `true` info will still be displayed if state of the entity is `0` or `unavailable`. |
| display_zero_tolerance | `number` | `0` | If set, the device will be displayed if the state is greater than the tolerance set. No need to set `display_zero` property to true. |
| template | `string` | `undefined` | Here you can enter a [HA Template](https://www.home-assistant.io/docs/configuration/templating/). The output of the template will be displayed. Space is limited inside the circle and too much text will result in overflow using ellipsis, so use with caution. Will update automatically in case one of the provided entities inside the template updates. Can only be used in case `entity` was not set. |


### Minimal Configuration

> Don't forget to change the entity ids

The following configurations will allow you to achieve your results with the least amount of lines of code / complexity.
In these examples I decided to use the Split entities option, but feel free to use the combined entity option. [More Info](#split-entities)

##### Only Grid

```yaml
type: custom:energy-flow-card-plus
entities:
  grid:
    entity:
      consumption: sensor.grid_consumed_energy_daily
      production: sensor.grid_returned_energy_daily
wh_kwh_threshold: 0
```

This should give you something like this:

![demo-only-grid-minimal](https://github.com/flixlix/energy-flow-card-plus/assets/61006057/e70d41d8-bd72-4f1a-b332-8d3b74cd1264)

##### Grid and Solar

```yaml
type: custom:energy-flow-card-plus
entities:
  grid:
    entity:
      consumption: sensor.grid_consumed_energy_daily
      production: sensor.grid_returned_energy_daily
  solar:
    entity: sensor.solar_energy_daily
wh_kwh_threshold: 0
```

This should give you something like this:

![demo-grid-and-solar-minimal](https://github.com/flixlix/energy-flow-card-plus/assets/61006057/185120e5-bd0a-4a7b-85c7-50509f7bc4d0)

##### Grid, Solar and Battery

```yaml
type: custom:energy-flow-card-plus
entities:
  grid:
    entity:
      consumption: sensor.grid_consumed_energy_daily
      production: sensor.grid_returned_energy_daily
  solar:
    entity: sensor.solar_energy_daily
  battery:
    entity:
      consumption: sensor.battery_out_energy_daily
      production: sensor.battery_in_energy_daily
wh_kwh_threshold: 0

```

This should give you something like this:

![demo-grid-solar-and-battery-minimal](https://github.com/flixlix/energy-flow-card-plus/assets/61006057/402b50be-d92c-4684-8f8e-0ffb5f4b48a5)

### Flow Formula

This formula is based on the official formula used by the Energy Distribution card.

```js
max - (value / totalLines) * (max - min);
// max = max_flow_rate
// min = min_flow_rate
// value = line value, solar to grid for example
// totalLines = gridConsumption + solarConsumption + solarToBattery +
//   solarToGrid + batteryConsumption + batteryFromGrid + batteryToGrid
```

### New Flow Formula

In contrast to the old flow formula, this formula calculates the flow rate independently from other lines, making it more intuitive to interpret the perceived energy. This means that a state of `10W` will always flow with the same velocity, no matter what other lines are doing. In other words this flow rate is calculated in absolute and not relative values.

To get this new Flow Formula to work, simply set `use_new_flow_rate_model` in the main configuration to true. You may want to play around with the `max_expected_energy`, `min_expected_energy`, `max_flow_rate` and `min_flow_rate` to get the speeds that you wish

```js
if(value > maxIn) return maxOut; // In case energy exceeds maximum expected energy, use the fastest speed and ignore the rest.
return ((value  -  minIn) * (maxOut  -  minOut)) / (maxIn  -  minIn) +  minOut;

// value = value of the current line to calculate (eg: grid to home)
//
// minIn = amount of watthours at which the lowest speed will be selected. 
//   ↳ In your configuration this is `min_expected_energy`
//   ↳ eg: setting this at `100` means that at `100` watthours, the dots will still flow at the lowest speed
// maxIn = amount of watthours at which the highest speed will be selected. 
//   ↳ In your configuration this is `max_expected_energy`
//   ↳ eg: setting this at `2000` means that everything more than `2000` will flow at the highest speed selected
//
// minOut = amount of watthours at which the lowest speed will be selected. 
//   ↳ In your configuration this is `max_flow_rate`
//   ↳ eg: setting this at `5` means that one dot will take `5` second to travel
// maxOut = amount of watthours at which the highest speed will be selected. 
//   ↳ In your configuration this is `min_flow_rate`
//   ↳ eg: setting this at `1` means that one dot will take `1` second to travel
```

The following video aims to show the diffence between the two flow formulas:


https://user-images.githubusercontent.com/61006057/231479254-91d6c625-8f38-4abb-b9ba-8dd24d6395f3.mp4

Notice that when the Energy changes to only coming from the sun, the old formula accelerates to maintain a constant amount of dots/second. 
Using the new formula is more intuitive, since you can immediately see that the Solar Energy is relatively low since the dots are flowing very slowly.
On the old Flow Formula you might think that the sun produced a lot of energy, which in this case is not true.

At the end of the day these are two options and depending on what you're interested, one might suit you better than the other, that's why I kept the old formula, you have the choice. 🙂

I am still just one person working on this project and obviously have other things going on in my life, so feel free to contribute to the project. You can also feel free to create a PR with a new feature and I'll try my best to review it 😊
