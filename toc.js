const cheerio = require('cheerio');

/** Attribute which if found on a heading means the heading is excluded */
const ignoreAttribute = 'data-toc-exclude';

const defaults = {
    tags: ['h2', 'h3', 'h4'],
    ignoredElements: [],
    wrapper: 'nav',
    wrapperClass: 'toc',
    headingText: '',
    headingTag: 'h2'
};

function getParent(prev, current) {
    if (current.level > prev.level) {
        //child heading
        return prev;
    } else if (current.level === prev.level) {
        //sibling of previous
        return prev.parent;
    } else {
        //above the previous
        return getParent(prev.parent, current);
    }
}

class Item {
    constructor($el,firstlevel) {
        if ($el) {
            this.slug = $el.attr('id');
           
            this.text = $el.html().replaceAll(/id\s*=\s*"[^"]*"/g, '').replaceAll(/deeplink/g, 'deeplink hidden');

            this.level = +$el.get(0).tagName.slice(1);
            this.firstlevel=firstlevel;
        } else {
            this.level = 0;
        }
        this.children = [];
    }

    html() {
        let markup = '';
        if (this.slug && this.text) {
            markup += `
                    <li class="tocLevel${this.level-this.firstlevel+1}"><a href="#${this.slug}">${this.text}</a>
            `;
        }
        if (this.children.length > 0) {
            markup += `
                <ol>
                    ${this.children.map(item => item.html()).join('\n')}
                </ol>
            `;
        }

        if (this.slug && this.text) {
            markup += '\t\t</li>'
        }

        return markup;
    }
}

class Toc {
    constructor(htmlstring = '', options = defaults) {
        this.options = {...defaults, ...options};
        const selector = this.options.tags.join(',');
        let firstlevel=6;
        const  tags=this.options.tags;
        for (var tag0 in tags){        
            if(tags[tag0].slice(1)< firstlevel) 
                firstlevel=tags[tag0].slice(1);
        }
        
        this.root = new Item();
        this.root.parent = this.root;
        
        const $ = cheerio.load(htmlstring);

        const headings = $(selector)
            .filter('[id]')
            .filter(`:not([${ignoreAttribute}])`);

        const ignoredElementsSelector = this.options.ignoredElements.join(',')
        headings.find(ignoredElementsSelector).remove()

        if (headings.length) {
            let previous = this.root;
            headings.each((index, heading) => {
                const current = new Item($(heading),firstlevel);
                const parent = getParent(previous, current);
                current.parent = parent;
                parent.children.push(current);
                previous = current;
            })
        }
    }

    get() {
        return this.root;
    }

    html() {
        const {wrapper, wrapperClass, headingText, headingTag} = this.options;
        const root = this.get();

        let html = '';

        if (root.children.length) {

            if (headingText) {
                html += `<${headingTag}>${headingText}</${headingTag}>\n`;
            }

            html += `<${wrapper} class="${wrapperClass}">${root.html()}</${wrapper}>`;
        }

        return html;
    }
}

module.exports = Toc;
module.exports.Item = Item;
