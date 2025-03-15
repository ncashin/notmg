type Entity = number;

const entities: Array<any> = [];

type Component = { type: string };

export const createEntity = (): Entity => {
  const newEntity = entities.length;
  entities.push({});
  return newEntity;
};

export const getComponent = <ComponentType extends Component>(
  entity: Entity,
  COMPONENT_TYPE_DEF: ComponentType
): ComponentType => {
  return entities[entity][COMPONENT_TYPE_DEF.type] as ComponentType;
};
export const addComponent = <ComponentType extends Component>(
  entity: Entity,
  COMPONENT_TYPE_DEF: ComponentType
) => {
  entities[entity][COMPONENT_TYPE_DEF.type] =
    structuredClone(COMPONENT_TYPE_DEF);
};

export const queryEntities = (
  COMPONENT_TYPE_DEFS: Array<any>,
  lambda: (arg0: Entity) => void
) => {
  for (let i = 0; i < entities.length; i++) {
    const satisfiesQuery = (
      COMPONENT_TYPE_DEFS satisfies Array<Component>
    ).reduce(
      (hasComponents, COMPONENT_TYPE_DEF) =>
        hasComponents && entities[i][COMPONENT_TYPE_DEF.type] !== undefined,
      true
    );
    if (satisfiesQuery) lambda(i);
  }
};
