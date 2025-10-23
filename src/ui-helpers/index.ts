import { svg, TemplateResult } from "lit";

export const renderLine = (id: string, path: string, cssClass: string | undefined = undefined): TemplateResult => {
  return svg`
      <path id="${id}" class="${cssClass || id}" d="${path}" vector-effect="non-scaling-stroke"/>
      `;
};

export const renderDot = (size: number, cssClass: string, duration: number, reverseDirection: boolean = false, pathRef: string | undefined = undefined): TemplateResult => {
  return svg`
      <circle r="${size}" class="${cssClass}" vector-effect="non-scaling-stroke">
        <animateMotion dur="${duration}s" repeatCount="indefinite" keyPoints="${reverseDirection ? "1; 0" : "0; 1"}" keyTimes="0; 1" calcMode="linear">
          <mpath xlink: href = "#${pathRef ?? cssClass}"/>
        </animateMotion>
      </circle>
      `;
};
