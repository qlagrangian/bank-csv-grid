import { Entity } from '../interfaces/entity';
interface EntityContextProps {
    entity?: Entity;
}
declare const EntityContext: import("react").Context<EntityContextProps>;
export default EntityContext;
