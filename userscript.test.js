// @ts-check
/// <reference types="jest" />

const {
  removeInclusiveWriting,
  isContentEditable,
  hasAnyContentEditableParent,
  acceptNodeFilter,
} = require("./userscript.js");

// Mock the Node and NodeFilter globals that would be available in a browser
// @ts-ignore
global.Node = {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,
};

// @ts-ignore
global.NodeFilter = {
  FILTER_ACCEPT: 1,
  FILTER_REJECT: 2,
  FILTER_SKIP: 3,
  SHOW_TEXT: 4,
};

describe("Stop Inclusive Writing", () => {
  describe("Middle dots (·)", () => {
    test("should handle directeur·rice pattern", () => {
      expect(
        removeInclusiveWriting("Jean-Michel le directeur·rice arrive")
      ).toBe("Jean-Michel le directeur arrive");
    });

    test("should handle complex sentence with multiple patterns", () => {
      const input =
        "Les be·aux·lles ambassadeur·rice·s sont arrivé·e·s avec les chef·fe·s";
      expect(removeInclusiveWriting(input)).toBe(
        "Les beaux ambassadeurs sont arrivés avec les chefs"
      );
    });

    test("should handle cher·e·s pattern", () => {
      expect(removeInclusiveWriting("Cher·e·s copaines")).toBe("Chers copains");
    });

    test("should handle quelqu'un·e pattern", () => {
      expect(removeInclusiveWriting("quelqu'un·e serait-il·elle prêt·e")).toBe(
        "quelqu'un serait-il prêt"
      );
    });
  });

  describe("Middle dots (•)", () => {
    test("should handle directeur•rice pattern", () => {
      expect(
        removeInclusiveWriting("Jean-Michel le directeur•rice arrive")
      ).toBe("Jean-Michel le directeur arrive");
    });

    test("should handle complex sentence with multiple patterns", () => {
      const input =
        "Les be•aux•lles ambassadeur•rice•s sont arrivé•e•s avec les chef•fe•s";
      expect(removeInclusiveWriting(input)).toBe(
        "Les beaux ambassadeurs sont arrivés avec les chefs"
      );
    });
  });

  describe("Middle dots (⋅)", () => {
    test("should handle directeur⋅rice pattern", () => {
      expect(
        removeInclusiveWriting("Jean-Michel le directeur⋅rice arrive")
      ).toBe("Jean-Michel le directeur arrive");
    });

    test("should handle complex sentence with multiple patterns", () => {
      const input =
        "Les be⋅aux⋅lles ambassadeur⋅rice⋅s sont arrivé⋅e⋅s avec les chef⋅fe⋅s";
      expect(removeInclusiveWriting(input)).toBe(
        "Les beaux ambassadeurs sont arrivés avec les chefs"
      );
    });
  });

  describe("Middle dots (‧)", () => {
    test("should handle directeur‧rice pattern", () => {
      expect(
        removeInclusiveWriting("Jean-Michel le directeur‧rice arrive")
      ).toBe("Jean-Michel le directeur arrive");
    });

    test("should handle complex sentence with multiple patterns", () => {
      const input =
        "Les be‧aux‧lles ambassadeur‧rice‧s sont arrivé‧e‧s avec les chef‧fe‧s";
      expect(removeInclusiveWriting(input)).toBe(
        "Les beaux ambassadeurs sont arrivés avec les chefs"
      );
    });
  });

  describe("Regular dots (.)", () => {
    test("should handle directeur.rice pattern", () => {
      expect(
        removeInclusiveWriting("Jean-Michel le directeur.rice arrive")
      ).toBe("Jean-Michel le directeur arrive");
    });

    test("should handle complex sentence with multiple patterns", () => {
      const input =
        "Les be.aux.lles ambassadeur.rice.s sont arrivé.e.s avec les chef.fe.s";
      expect(removeInclusiveWriting(input)).toBe(
        "Les beaux ambassadeurs sont arrivés avec les chefs"
      );
    });
  });

  describe("Hyphens (-)", () => {
    test("should handle directeur-rice pattern", () => {
      expect(
        removeInclusiveWriting("Jean-Michel le directeur-rice arrive")
      ).toBe("Jean-Michel le directeur arrive");
    });

    test("should handle complex sentence with multiple patterns", () => {
      const input =
        "Les be-aux-lles ambassadeur-rice-s sont arrivé-e-s avec les chef-fe-s";
      expect(removeInclusiveWriting(input)).toBe(
        "Les beaux ambassadeurs sont arrivés avec les chefs"
      );
    });
  });

  describe("Special cases", () => {
    test("should handle instituteurice pattern", () => {
      expect(removeInclusiveWriting("L'instituteurice sera en retard")).toBe(
        "L'instituteur sera en retard"
      );
    });

    test("should not modify valid hyphenated names", () => {
      expect(
        removeInclusiveWriting("E.Leclerc a des liens avec Paris-Est")
      ).toBe("E.Leclerc a des liens avec Paris-Est");
    });

    test("should handle iel pronoun", () => {
      expect(removeInclusiveWriting("car iel a une annonce")).toBe(
        "car il a une annonce"
      );
      expect(removeInclusiveWriting("serait-iel prêt")).toBe("serait-il prêt");
    });

    test("should handle illes pronoun", () => {
      expect(removeInclusiveWriting("car illes doivent rencontrer")).toBe(
        "car ils doivent rencontrer"
      );
    });
  });

  describe("DOM Node Filtering", () => {
    describe("isContentEditable", () => {
      test("should identify contenteditable elements", () => {
        const node = {
          nodeType: Node.ELEMENT_NODE,
          attributes: {
            getNamedItem: (name) =>
              name === "contenteditable" ? { value: "true" } : null,
          },
        };
        expect(isContentEditable(node)).toBe(true);
      });

      test("should identify plaintext-only contenteditable elements", () => {
        const node = {
          nodeType: Node.ELEMENT_NODE,
          attributes: {
            getNamedItem: (name) =>
              name === "contenteditable" ? { value: "plaintext-only" } : null,
          },
        };
        expect(isContentEditable(node)).toBe(true);
      });

      test("should return false for non-contenteditable elements", () => {
        const node = {
          nodeType: Node.ELEMENT_NODE,
          attributes: {
            getNamedItem: () => null,
          },
        };
        expect(isContentEditable(node)).toBe(false);
      });

      test("should return false for text nodes", () => {
        const node = {
          nodeType: Node.TEXT_NODE,
        };
        expect(isContentEditable(node)).toBe(false);
      });
    });

    describe("hasAnyContentEditableParent", () => {
      test("should detect contenteditable parent", () => {
        const textNode = {
          nodeType: Node.TEXT_NODE,
          parentNode: {
            nodeType: Node.ELEMENT_NODE,
            attributes: {
              getNamedItem: (name) =>
                name === "contenteditable" ? { value: "true" } : null,
            },
            parentNode: null,
          },
        };
        expect(hasAnyContentEditableParent(textNode)).toBe(true);
      });

      test("should detect contenteditable ancestor", () => {
        const textNode = {
          nodeType: Node.TEXT_NODE,
          parentNode: {
            nodeType: Node.ELEMENT_NODE,
            attributes: {
              getNamedItem: () => null,
            },
            parentNode: {
              nodeType: Node.ELEMENT_NODE,
              attributes: {
                getNamedItem: (name) =>
                  name === "contenteditable" ? { value: "true" } : null,
              },
              parentNode: null,
            },
          },
        };
        expect(hasAnyContentEditableParent(textNode)).toBe(true);
      });

      test("should return false when no contenteditable parent exists", () => {
        const textNode = {
          nodeType: Node.TEXT_NODE,
          parentNode: {
            nodeType: Node.ELEMENT_NODE,
            attributes: {
              getNamedItem: () => null,
            },
            parentNode: null,
          },
        };
        expect(hasAnyContentEditableParent(textNode)).toBe(false);
      });
    });

    describe("acceptNodeFilter", () => {
      test("should reject nodes with script parent", () => {
        const node = {
          parentNode: {
            nodeName: "SCRIPT",
          },
        };
        expect(acceptNodeFilter(node)).toBe(NodeFilter.FILTER_REJECT);
      });

      test("should reject nodes with contenteditable parent", () => {
        const node = {
          parentNode: {
            nodeName: "DIV",
            nodeType: Node.ELEMENT_NODE,
            attributes: {
              getNamedItem: (name) =>
                name === "contenteditable" ? { value: "true" } : null,
            },
            parentNode: null,
          },
        };
        expect(acceptNodeFilter(node)).toBe(NodeFilter.FILTER_REJECT);
      });

      test("should accept valid text nodes", () => {
        const node = {
          parentNode: {
            nodeName: "DIV",
            nodeType: Node.ELEMENT_NODE,
            attributes: {
              getNamedItem: () => null,
            },
            parentNode: null,
          },
        };
        expect(acceptNodeFilter(node)).toBe(NodeFilter.FILTER_ACCEPT);
      });
    });
  });
});
