//@ts-nocheck
"use server";

import { sql } from "kysely";
import { DEFAULT_PAGE_SIZE } from "../../constant";
import { db } from "../../db";
import { InsertProducts, UpdateProducts } from "@/types";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/utils/authOptions";
import { cache } from "react";

// export async function getProducts(pageNo = 1, pageSize = DEFAULT_PAGE_SIZE) {
//   try {
//     let products;
//     let dbQuery = db.selectFrom("products").selectAll("products");

//     const { count } = await dbQuery
//       // .select(sql`COUNT(DISTINCT products.id) as count`)
//       .executeTakeFirst();

//     const lastPage = Math.ceil(count / pageSize);

//     products = await dbQuery
//       .distinct()
//       .offset((pageNo - 1) * pageSize)
//       .limit(pageSize)
//       .execute();

//     const numOfResultsOnCurPage = products.length;

//     return { products, count, lastPage, numOfResultsOnCurPage };
//   } catch (error) {
//     throw error;
//   }
// }
export async function getProducts(
  pageNo = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  filters = {}
) {
  try {
    let dbQuery = db.selectFrom("products").selectAll("products");
    console.log("filters", filters)

    if (filters.brandIds && filters.brandIds.length > 0) {
      const conditions = filters.brandIds.map(brandId =>
        sql`FIND_IN_SET(${brandId}, products.brands) > 0`
      );
      dbQuery = dbQuery.where(sql`${sql.join(conditions, sql` OR `)}`);
    }

    if (filters.categoryIds && filters.categoryIds.length > 0) {
      dbQuery = dbQuery
        .innerJoin("product_categories", "products.id", "product_categories.product_id")
        .where("product_categories.category_id", "in", filters.categoryIds);
    }

    if (filters.gender) {
      dbQuery = dbQuery.where("gender", "=", filters.gender);
    }

    if (filters.priceRangeTo) {
      dbQuery = dbQuery.where("price", "<=", filters.priceRangeTo);
    }

    if (filters.discount) {
      const [minDiscountStr, maxDiscountStr] = filters.discount.split('-');
      const minDiscount = Number(minDiscountStr);
      const maxDiscount = Number(maxDiscountStr);

      if (!isNaN(minDiscount) && !isNaN(maxDiscount)) {
        dbQuery = dbQuery.where('products.discount', '>=', minDiscount)
          .where('products.discount', '<=', maxDiscount);
      }
    }


    if (filters.occasions && filters.occasions.length > 0) {
      const conditions = filters.occasions.map((occasion) =>
        sql`FIND_IN_SET(${occasion}, products.occasion) > 0`
      );

      dbQuery = dbQuery.where(sql`${sql.join(conditions, sql` OR `)}`);
    }
    // include other filters as needed

     if (filters.sortBy) {
      const [column, order] = filters.sortBy.split("-");
      // Validate columns to avoid SQL injection
      const validColumns = ["price", "created_at", "rating"];
      const validOrder = ["asc", "desc"];

      if (validColumns.includes(column) && validOrder.includes(order.toLowerCase())) {
        dbQuery = dbQuery.orderBy(column, order as "asc" | "desc");
      }
    }
    const count = await dbQuery
      // .select(sql`COUNT(DISTINCT products.id) as count`)
      .executeTakeFirst();

    const totalCount = Number(count?.count ?? 0);
    const lastPage = Math.ceil(totalCount / pageSize);

    const products = await dbQuery
      .distinct()
      .offset((pageNo - 1) * pageSize)
      .limit(pageSize)
      .execute();

    const numOfResultsOnCurPage = products.length;

    return { products, count: totalCount, lastPage, numOfResultsOnCurPage };
  } catch (error) {
    throw error;
  }
}

export const getProduct = cache(async function getProduct(productId: number) {
  // console.log("run");
  try {
    const product = await db
      .selectFrom("products")
      .selectAll()
      .where("id", "=", productId)
      .execute();

    return product;
  } catch (error) {
    return { error: "Could not find the product" };
  }
});

async function enableForeignKeyChecks() {
  await sql`SET foreign_key_checks = 1`.execute(db);
}

async function disableForeignKeyChecks() {
  await sql`SET foreign_key_checks = 0`.execute(db);
}

export async function deleteProduct(productId: number) {
  try {
    await disableForeignKeyChecks();
    await db
      .deleteFrom("product_categories")
      .where("product_categories.product_id", "=", productId)
      .execute();
    await db
      .deleteFrom("reviews")
      .where("reviews.product_id", "=", productId)
      .execute();

    await db
      .deleteFrom("comments")
      .where("comments.product_id", "=", productId)
      .execute();

    await db.deleteFrom("products").where("id", "=", productId).execute();

    await enableForeignKeyChecks();
    revalidatePath("/products");
    return { message: "success" };
  } catch (error) {
    return { error: "Something went wrong, Cannot delete the product" };
  }
}

export async function MapBrandIdsToName(brandsId) {
  const brandsMap = new Map();
  try {
    for (let i = 0; i < brandsId.length; i++) {
      const brandId = brandsId.at(i);
      const brand = await db
        .selectFrom("brands")
        .select("name")
        .where("id", "=", +brandId)
        .executeTakeFirst();
      brandsMap.set(brandId, brand?.name);
    }
    return brandsMap;
  } catch (error) {
    throw error;
  }
}

export async function getAllProductCategories(products: any) {
  try {
    const productsId = products.map((product) => product.id);
    const categoriesMap = new Map();

    for (let i = 0; i < productsId.length; i++) {
      const productId = productsId.at(i);
      const categories = await db
        .selectFrom("product_categories")
        .innerJoin(
          "categories",
          "categories.id",
          "product_categories.category_id"
        )
        .select("categories.name")
        .where("product_categories.product_id", "=", productId)
        .execute();
      categoriesMap.set(productId, categories);
    }
    return categoriesMap;
  } catch (error) {
    throw error;
  }
}

export async function getProductCategories(productId: number) {
  try {
    const categories = await db
      .selectFrom("product_categories")
      .innerJoin(
        "categories",
        "categories.id",
        "product_categories.category_id"
      )
      .select(["categories.id", "categories.name"])
      .where("product_categories.product_id", "=", productId)
      .execute();

    return categories;
  } catch (error) {
    throw error;
  }
}
