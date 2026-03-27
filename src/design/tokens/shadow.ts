import designTokens from "./design-tokens-draft.json";

export const shadow = designTokens.shadow as {
  readonly soft1: string;
  readonly soft2: string;
  readonly float: string;
  readonly focusRing: string;
};

export const sceneWrapperTokens = designTokens.sceneWrapper as {
  readonly gradientOpacity: { readonly dark: number; readonly light: number };
  readonly depthShadow: { readonly dark: string; readonly light: string };
  readonly gradientAngle: number;
};

export const sceneInteriorTokens = designTokens.sceneInterior as {
  readonly containerBgOpacity: {
    readonly dark: number;
    readonly light: number;
  };
  readonly textureOpacity: number;
  readonly dimOpacity: number;
  readonly accentLine: { readonly height: number; readonly width: number };
};
