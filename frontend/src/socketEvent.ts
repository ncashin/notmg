export type ClientUpdateMessage = {
  type: "update";
  data: {
    x: number;
    y: number;
  };
};
export type ClientAbilityMessage = {
  type: "ability";
  data: {
    entityID: string;
  };
};
