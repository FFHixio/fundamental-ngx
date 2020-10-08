import {
    Injectable,
    OnDestroy
} from '@angular/core';
import { PluginDescriptor } from './plugin-descriptor.model';

@Injectable()
export class LookupService implements OnDestroy {
    private pluginsRepository: Array<Partial<PluginDescriptor>>;


    constructor() {
        this.pluginsRepository = [];
    }


    lookup(query: Map<string, string>): LookupItem {
        const found = this.pluginsRepository.filter((p) => {
            let match;
            query.forEach((v, k) => {
                match = (match === undefined) ? p[k] === v : (match && p[k] === v);
            });
            return match;
        });

        if (found.length === 0) {
            throw new Error('No Plugin found. Please check your configuration.');
        }
        const item: LookupItem = {
            id: found[0].name,
            attributes: query,
            version: found[0].version,
            descriptor: found[0]
        };

        // take the first one.
        return item;
    }

    addPlugin(plugin: Partial<PluginDescriptor>): void {
        const found = this.pluginsRepository.find((p) => p.name === plugin.name);
        if (!found) {
            this.pluginsRepository.push(plugin);
        }
    }

    ngOnDestroy(): void {
        this.pluginsRepository = null;
    }
}

export interface LookupItem {
    id: string;
    attributes: Map<string, string>;
    version: string;
    descriptor: Partial<PluginDescriptor>;
}
