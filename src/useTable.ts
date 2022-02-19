import { TableFieldObject } from "@/types/TableField";
import {
  computed,
  ComputedRef,
  HTMLAttributes,
  ref,
  Ref,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "vue";
import { TableField, TableItem } from "./types";

interface TableItemDisplay<T = Record<string, unknown>> {
  item: TableItem<T>;
  index: number;
  field: TableFieldObject;
  unformatted: unknown;
  value: unknown;
  detailShowing: boolean;
  rowSelected: boolean;
}
interface UseTableOptions<T> {
  items: Ref<TableItem<T>[]>;
  fields?: TableField[];
  tdAttr?: Ref<TdHTMLAttributes>;
  thAttr?: Ref<ThHTMLAttributes>;
  pageSize?: number;
  pageIndex?: number;
  filter?: Ref<string>;
}

interface UseTableReturn<T> {
  tableProps: ComputedRef<HTMLAttributes>;
  tableBodyProps: ComputedRef<HTMLAttributes>;
  rows: Ref<TableItemDisplay<T>[][]>;
  header: ComputedRef<TableFieldObject[]>;
  pageSize: Ref<number>;
  pageIndex: Ref<number>;
  totalPages: Ref<number>;
  canPrev: Ref<boolean>;
  canNext: Ref<boolean>;
}

type TableClass = string | string[];

function useTable<T = Record<string, unknown>>({
  items = ref([]),
  fields = [],
  pageSize = 10,
  pageIndex = 0,
  filter = ref(""),
}: UseTableOptions<T>): UseTableReturn<T> {
  const _pageSize = ref(pageSize);
  const _pageIndex = ref(pageIndex);

  const tableProps = computed<HTMLAttributes>(() => ({
    role: "table",
  }));

  const _fields = computed(() => {
    if (fields && fields.length > 0) {
      return fields.map((field) => normalizeField(field));
    }

    if (items.value.length > 0) {
      return Object.keys(items.value[0]).map((key) =>
        normalizeField(key)
      ) as TableFieldObject[];
    }

    return [];
  });

  function normalizeField(field: string | TableField): TableFieldObject {
    if (typeof field === "string") {
      return {
        key: field,
        label: getNameFromKey(field),
      };
    }

    return {
      ...field,
      label: field.label || getNameFromKey(field.key),
      tdClass: resolveClass(field.variant, field.class, field.tdClass),
      thClass: resolveClass(field.variant, field.class, field.thClass),
    };
  }

  function resolveClass(
    variant?: string,
    a?: TableClass,
    b?: TableClass
  ): string {
    let classes = "";

    if (variant) {
      classes = `table-${variant}`;
    }

    // TODO: hacer que soporte una función
    if (Array.isArray(a) && a.length > 0) {
      classes += a.join(" ");
    } else if (typeof a === "string") {
      classes += a;
    }

    if (!b) {
      return classes;
    }

    classes += " ";

    // TODO: hacer que soporte una función
    if (Array.isArray(b) && b.length > 0) {
      classes += b.join(" ");
    } else if (typeof b === "string") {
      classes += b;
    }

    return classes;
  }

  function getNameFromKey(key: string): string {
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    label.replaceAll("_", " ");

    return label;
  }

  const itemsFiltered = computed(() => {
    if (filter?.value) {
      return items.value.filter((item) => {
        return Object.values(item).some((value) =>
          value.toString().toUpperCase().includes(filter.value.toUpperCase())
        );
      });
    }

    return items.value;
  });

  const rows = computed(() => {
    if (itemsFiltered.value.length > 0) {
      return itemsFiltered.value.map((item, index) => {
        const row: TableItemDisplay<T>[] = [];

        _fields.value.forEach((field) => {
          const key = field.key;
          const value = item[key as keyof TableItem<T>];

          row.push({
            detailShowing: false,
            rowSelected: false,
            index,
            field,
            item,
            unformatted: value,
            value: field.formatter ? field.formatter(value, key, item) : value,
          });
        });

        return row;
      });
    }
    return [];
  });

  const rowsPaginated = computed(() => {
    const offset = _pageIndex.value * _pageSize.value;

    const paginatedItems = rows.value.slice(offset).slice(0, _pageSize.value);

    return paginatedItems;
  });

  const tableBodyProps = computed<HTMLAttributes>(() => ({
    role: "rowgroup",
  }));

  const totalPages = computed<number>(
    () => Math.ceil(rows.value.length / pageSize) - 1
  );

  const canPrev = computed(() => _pageIndex.value > 0);
  const canNext = computed(() => _pageIndex.value < totalPages.value);

  return {
    tableProps,
    tableBodyProps,
    rows: rowsPaginated,
    header: _fields,
    pageIndex: _pageIndex,
    pageSize: _pageSize,
    canPrev,
    canNext,
    totalPages,
  };
}

export default useTable;
