import { Config } from '../interfaces/config';
interface ConfigContextProps {
    config: Config;
}
declare const ConfigContext: import("react").Context<ConfigContextProps>;
export default ConfigContext;
