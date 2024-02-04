import { ens_normalize } from './lib';
import { readFileSync } from 'fs';
console.log(run_tests(JSON.parse(readFileSync('./tests.json', { encoding: 'utf8' }))));
function run_tests(tests) {
    let errors = [];
    for (let test of tests) {
        let { name, norm, error } = test;
        if (typeof norm !== 'string')
            norm = name;
        try {
            let result = ens_normalize(name);
            if (error) {
                errors.push(Object.assign({ type: 'expected error', result }, test));
            }
            else if (result != norm) {
                errors.push(Object.assign({ type: 'wrong norm', result }, test));
            }
        }
        catch (err) {
            if (!error) {
                errors.push(Object.assign({ type: 'unexpected error', result: err.message }, test));
            }
        }
    }
    return errors;
}
//# sourceMappingURL=validate.js.map