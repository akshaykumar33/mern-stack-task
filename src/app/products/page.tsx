import { getProducts } from "@/actions/productActions";
import { DEFAULT_PAGE_SIZE } from "../../../constant";
import PaginationSection from "@/components/PaginationSection";
import SortBy from "@/components/SortBy";
import Filter from "@/components/Filter";
import ProductTable from "@/components/ProductTable";
import { Suspense } from "react";
import { getCategories } from "@/actions/categoryActions";
import { getBrands } from "@/actions/brandActions";

export default async function Products({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const { page = 1, pageSize = DEFAULT_PAGE_SIZE } = searchParams as any;
  // console.log("searchParams",searchParams);
  const brandIds = searchParams?.["brandId"]
    ? typeof searchParams["brandId"] === "string"
      ? searchParams["brandId"].split(",").map((id) => Number(id))
      : Array.isArray(searchParams["brandId"])
      ? searchParams["brandId"].map((id) => Number(id))
      : []
    : [];
  const categoryIds = searchParams?.["categoryId"]
    ? typeof searchParams["categoryId"] === "string"
      ? searchParams["categoryId"].split(",").map((id) => Number(id))
      : Array.isArray(searchParams["categoryId"])
      ? searchParams["categoryId"].map((id) => Number(id))
      : []
    : [];
  const gender = searchParams?.["gender"] ?? null;
  const priceRangeTo = searchParams?.["priceRangeTo"] ?? null;
  const occasions = searchParams?.["occasions"]
    ? typeof searchParams["occasions"] === "string"
      ? searchParams["occasions"].split(",")
      : Array.isArray(searchParams["occasions"])
      ? searchParams["occasions"]
      : []
    : [];
  const discount = searchParams?.["discount"] ?? null;
  const sortBy = searchParams?.["sortBy"] ?? null;

  const { products, lastPage, numOfResultsOnCurPage } = await getProducts(
    +page,
    +pageSize,
    {
      brandIds,
      categoryIds,
      gender,
      priceRangeTo,
      occasions,
      discount,
      sortBy,
    }
  );

  const brands = await getBrands();
  const categories = await getCategories();

  return (
    <div className="pb-20 pt-8">
      <h1 className="text-4xl mb-8">Product List</h1>
      <div className="mb-8">
        <SortBy />
        <div className="mt-4">
          <Filter categories={categories} brands={brands} />
        </div>
      </div>

      <h1 className="text-lg font-bold mb-4">Products</h1>
      <Suspense
        fallback={<p className="text-gray-300 text-2xl">Loading Products...</p>}
      >
        <ProductTable
          products={products}
          numOfResultsOnCurPage={numOfResultsOnCurPage}
        />
      </Suspense>
      {products.length > 0 && (
        <PaginationSection
          lastPage={lastPage}
          pageNo={+page}
          pageSize={+pageSize}
        />
      )}
    </div>
  );
}
